import { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import Link from "next/link";

import { Disclosure } from "@headlessui/react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, MEMBER_TRACKER_ELEMENTS } from "@plane/constants";
import { TrashIcon, SuspendedUserIcon, ChevronDownIcon, CheckIcon } from "@plane/propel/icons";
import { Pill, EPillVariant, EPillSize } from "@plane/propel/pill";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IUser, IWorkspaceMember } from "@plane/types";
import type { IPolicy } from "@plane/permissions";
// plane ui
import { PopoverMenu } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useUser, useUserPermissions } from "@/hooks/store/user";
// services
import { IAMService } from "@/services/iam.service";

const iamService = new IAMService();

export interface RowData {
  member: IWorkspaceMember;
  role: EUserPermissions;
  is_active: boolean;
}

type NameProps = {
  rowData: RowData;
  workspaceSlug: string;
  isAdmin: boolean;
  currentUser: IUser | undefined;
  setRemoveMemberModal: (rowData: RowData) => void;
};

type PoliciesProps = {
  rowData: RowData;
  workspaceSlug: string;
  availablePolicies: IPolicy[];
  workspaceOwnerId?: string;
};

export function NameColumn(props: NameProps) {
  const { rowData, workspaceSlug, isAdmin, currentUser, setRemoveMemberModal } = props;
  // derived values
  const { avatar_url, display_name, email, first_name, id, last_name } = rowData.member;
  const isSuspended = rowData.is_active === false;

  return (
    <Disclosure>
      {() => (
        <div className="relative group">
          <div className="flex items-center gap-x-4 gap-y-2 w-72 justify-between">
            <div className="flex items-center gap-x-2 gap-y-2 flex-1">
              {isSuspended ? (
                <div className="bg-layer-1 rounded-full p-0.5">
                  <SuspendedUserIcon className="h-4 w-4 text-placeholder" />
                </div>
              ) : avatar_url && avatar_url.trim() !== "" ? (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full capitalize text-on-color">
                    <img
                      src={getFileURL(avatar_url)}
                      className="absolute left-0 top-0 h-full w-full rounded-full object-cover"
                      alt={display_name || email}
                    />
                  </span>
                </Link>
              ) : (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex h-4 w-4 text-11 items-center justify-center rounded-full  capitalize text-tertiary bg-layer-3">
                    {(email ?? display_name ?? "?")[0]}
                  </span>
                </Link>
              )}
              <span className={isSuspended ? "text-placeholder" : ""}>
                {first_name} {last_name}
              </span>
            </div>

            {!isSuspended && (isAdmin || id === currentUser?.id) && (
              <PopoverMenu
                data={[""]}
                keyExtractor={(item) => item}
                popoverClassName="justify-end"
                buttonClassName="outline-none	origin-center rotate-90 size-8 aspect-square flex-shrink-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                render={() => (
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-x-3 cursor-pointer"
                    onClick={() => setRemoveMemberModal(rowData)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRemoveMemberModal(rowData);
                      }
                    }}
                    data-ph-element={MEMBER_TRACKER_ELEMENTS.WORKSPACE_MEMBER_TABLE_CONTEXT_MENU}
                  >
                    <TrashIcon className="size-3.5 align-middle" /> {id === currentUser?.id ? "Leave " : "Remove "}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}
    </Disclosure>
  );
}

export const PoliciesColumn = observer(function PoliciesColumn(props: PoliciesProps) {
  const { rowData, workspaceSlug, availablePolicies, workspaceOwnerId } = props;
  // states
  const [isOpen, setIsOpen] = useState(false);
  const [memberPolicyIds, setMemberPolicyIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { data: currentUser } = useUser();

  // derived values
  const memberId = rowData.member.id;
  const isCurrentUser = currentUser?.id === memberId;
  const isOwner = workspaceOwnerId === memberId;
  const isAdminRole = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const canEdit = isAdminRole && !isCurrentUser && !isOwner;
  const isSuspended = rowData.is_active === false;

  // Fetch member policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      if (!workspaceSlug || !memberId) return;
      try {
        setIsLoading(true);
        const response = await iamService.fetchMemberPolicies(workspaceSlug.toString(), memberId);
        setMemberPolicyIds(response.direct_policy_ids.map(String));
      } catch (error) {
        console.error("Failed to fetch member policies:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicies();
  }, [workspaceSlug, memberId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get policy names for display
  const memberPolicies = availablePolicies.filter((p) => memberPolicyIds.includes(p.id));
  const policyNames = memberPolicies.map((p) => p.name).join(", ");

  const handleTogglePolicy = async (policyId: string) => {
    if (!canEdit || isUpdating) return;

    const newPolicyIds = memberPolicyIds.includes(policyId)
      ? memberPolicyIds.filter((id) => id !== policyId)
      : [...memberPolicyIds, policyId];

    try {
      setIsUpdating(true);
      await iamService.updateMemberPolicies(workspaceSlug.toString(), memberId, newPolicyIds);
      setMemberPolicyIds(newPolicyIds);
    } catch (error) {
      console.error("Failed to update member policies:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Failed to update policies. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Owner has full access - show "Root account"
  if (isOwner) {
    return (
      <div className="w-48 flex">
        <span className="text-11 text-primary font-medium">Root account</span>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="w-48 flex">
        <Pill variant={EPillVariant.DEFAULT} size={EPillSize.SM} className="border-none">
          Suspended
        </Pill>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-48 flex">
        <span className="text-11 text-tertiary">Loading...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-48">
      <button
        type="button"
        onClick={() => canEdit && setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-1 text-left text-11 ${
          canEdit ? "cursor-pointer hover:text-primary" : "cursor-default"
        }`}
        disabled={!canEdit}
      >
        <span className="truncate text-secondary">
          {policyNames || <span className="text-tertiary">No policies</span>}
        </span>
        {canEdit && <ChevronDownIcon className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
      </button>

      {/* Dropdown with checkboxes */}
      {isOpen && canEdit && (
        <div className="absolute z-30 mt-1 w-56 rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 shadow-sm">
          {availablePolicies.length === 0 ? (
            <div className="px-1 py-1.5 text-11 text-tertiary">No policies available</div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availablePolicies.map((policy) => {
                const isChecked = memberPolicyIds.includes(policy.id);
                return (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => handleTogglePolicy(policy.id)}
                    disabled={isUpdating}
                    className="flex w-full items-center gap-2 rounded-sm p-1.5 hover:bg-layer-transparent-hover disabled:opacity-50"
                  >
                    <div
                      className={`grid h-3 w-3 flex-shrink-0 place-items-center border rounded-xs ${
                        isChecked ? "border-accent-strong bg-accent-primary text-on-color" : "border-strong"
                      }`}
                    >
                      {isChecked && <CheckIcon width={10} height={10} strokeWidth={3} />}
                    </div>
                    <span className="flex-grow truncate text-left text-secondary">{policy.name}</span>
                    {policy.is_managed && <span className="text-tertiary">(Default)</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
