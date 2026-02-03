"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { Plus, X, Shield, User, Crown } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// services
import { IAMService } from "@/services/iam.service";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useWorkspace } from "@/hooks/store/use-workspace";
// types
import type { IPolicy } from "@plane/permissions";

const iamService = new IAMService();

type Props = {
  workspaceSlug: string;
};

type UserWithPolicies = {
  id: string;
  display_name: string;
  email: string;
  avatar?: string;
  policies: IPolicy[];
  isOwner?: boolean;
};

export const IAMUserPolicies = observer(function IAMUserPolicies({ workspaceSlug }: Props) {
  const [usersWithPolicies, setUsersWithPolicies] = useState<UserWithPolicies[]>([]);
  const [allPolicies, setAllPolicies] = useState<IPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");

  const { t } = useTranslation();

  // store hooks
  const {
    workspace: { workspaceMemberIds, getWorkspaceMemberDetails },
  } = useMember();
  const { currentWorkspace } = useWorkspace();

  // Get workspace owner ID
  const workspaceOwnerId = currentWorkspace?.owner?.id;

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch policies and user policies in parallel
        const [policies, userPolicies] = await Promise.all([
          iamService.fetchPolicies(workspaceSlug),
          iamService.fetchUserPolicies(workspaceSlug),
        ]);

        setAllPolicies(policies);

        // Build users with their policies
        const usersMap = new Map<string, UserWithPolicies>();

        // Add all workspace members
        workspaceMemberIds?.forEach((memberId) => {
          const member = getWorkspaceMemberDetails(memberId);
          if (member?.member) {
            usersMap.set(member.member.id, {
              id: member.member.id,
              display_name: member.member.display_name || member.member.email || "",
              email: member.member.email || "",
              avatar: (member.member as { avatar?: string }).avatar,
              policies: [],
              isOwner: member.member.id === workspaceOwnerId,
            });
          }
        });

        // Assign policies to users
        // API returns: { id, user, policy, policy_detail, ... }
        userPolicies.forEach((up: any) => {
          const user = usersMap.get(up.user);
          if (user && up.policy_detail) {
            user.policies.push(up.policy_detail);
          }
        });

        setUsersWithPolicies(Array.from(usersMap.values()));
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("workspace_settings.settings.iam.toasts.error.title"),
          message: t("workspace_settings.settings.iam.toasts.load_error.message"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceSlug, workspaceMemberIds, getWorkspaceMemberDetails, workspaceOwnerId]);

  const handleAssignPolicy = async (userId: string) => {
    if (!selectedPolicyId) return;

    try {
      await iamService.assignPolicyToUser(workspaceSlug, userId, selectedPolicyId);

      // Update local state
      const policy = allPolicies.find((p) => p.id === selectedPolicyId);
      if (policy) {
        setUsersWithPolicies((prev) =>
          prev.map((user) =>
            user.id === userId
              ? { ...user, policies: [...user.policies, policy] }
              : user
          )
        );
      }

      setAssigningUserId(null);
      setSelectedPolicyId("");

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("workspace_settings.settings.iam.toasts.policy_assigned.title"),
        message: t("workspace_settings.settings.iam.toasts.policy_assigned.message"),
      });
    } catch (error) {
      console.error("Failed to assign policy:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: t("workspace_settings.settings.iam.toasts.error.message"),
      });
    }
  };

  const handleRemovePolicy = async (userId: string, policyId: string) => {
    try {
      await iamService.removePolicyFromUser(workspaceSlug, userId, policyId);

      // Update local state
      setUsersWithPolicies((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, policies: user.policies.filter((p) => p.id !== policyId) }
            : user
        )
      );

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("workspace_settings.settings.iam.toasts.policy_removed.title"),
        message: t("workspace_settings.settings.iam.toasts.policy_removed.message"),
      });
    } catch (error) {
      console.error("Failed to remove policy:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: t("workspace_settings.settings.iam.toasts.error.message"),
      });
    }
  };

  const getAvailablePolicies = (user: UserWithPolicies) => {
    const assignedIds = new Set(user.policies.map((p) => p.id));
    return allPolicies.filter((p) => !assignedIds.has(p.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (usersWithPolicies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="rounded-full bg-surface-2 p-4 mb-4">
          <User className="h-8 w-8 text-tertiary" />
        </div>
        <h3 className="text-lg font-medium mb-2">{t("workspace_settings.settings.iam.users.no_users")}</h3>
        <p className="text-sm text-tertiary">
          {t("workspace_settings.settings.iam.users.no_users_description")}
        </p>
      </div>
    );
  }

  // Sort users: owner first, then alphabetically
  const sortedUsers = [...usersWithPolicies].sort((a, b) => {
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <div className="space-y-3">
      {sortedUsers.map((user) => (
        <div
          key={user.id}
          className={`p-4 rounded-lg border bg-surface-1 ${
            user.isOwner ? "border-amber-500/50" : "border-subtle"
          }`}
        >
          {/* User info */}
          <div className="flex items-center gap-3 mb-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.display_name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                user.isOwner ? "bg-amber-500/10" : "bg-primary/10"
              }`}>
                <span className={`font-medium ${user.isOwner ? "text-amber-600" : "text-primary"}`}>
                  {user.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{user.display_name}</h4>
                {user.isOwner && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                    <Crown className="h-3 w-3" />
                    {t("workspace_settings.settings.iam.users.owner")}
                  </span>
                )}
              </div>
              <p className="text-xs text-tertiary">{user.email}</p>
            </div>
          </div>

          {/* Owner has full access - no policies needed */}
          {user.isOwner ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs">
                <Shield className="h-3 w-3" />
                {t("workspace_settings.settings.iam.users.full_access")}
              </span>
              <span className="text-xs text-tertiary">
                {t("workspace_settings.settings.iam.users.owner_description")}
              </span>
            </div>
          ) : (
            <>
              {/* Policies */}
              <div className="flex flex-wrap items-center gap-2">
                {user.policies.map((policy) => (
                  <span
                    key={policy.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs"
                  >
                    <Shield className="h-3 w-3" />
                    {policy.name}
                    <button
                      onClick={() => handleRemovePolicy(user.id, policy.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {/* Add policy button/dropdown */}
                {assigningUserId === user.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPolicyId}
                      onChange={(e) => setSelectedPolicyId(e.target.value)}
                      className="text-sm border border-subtle rounded-md px-2 py-1 bg-surface-1"
                    >
                      <option value="">{t("workspace_settings.settings.iam.users.select_policy")}</option>
                      {getAvailablePolicies(user).map((policy) => (
                        <option key={policy.id} value={policy.id}>
                          {policy.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAssignPolicy(user.id)}
                      disabled={!selectedPolicyId}
                    >
                      {t("workspace_settings.settings.iam.users.assign")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAssigningUserId(null);
                        setSelectedPolicyId("");
                      }}
                    >
                      {t("workspace_settings.settings.iam.policies.cancel")}
                    </Button>
                  </div>
                ) : (
                  getAvailablePolicies(user).length > 0 && (
                    <button
                      onClick={() => setAssigningUserId(user.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-subtle text-tertiary text-xs hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {t("workspace_settings.settings.iam.users.add_policy")}
                    </button>
                  )
                )}
              </div>

              {user.policies.length === 0 && assigningUserId !== user.id && (
                <p className="text-xs text-tertiary mt-2">
                  {t("workspace_settings.settings.iam.users.no_policy_assigned")}
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
});
