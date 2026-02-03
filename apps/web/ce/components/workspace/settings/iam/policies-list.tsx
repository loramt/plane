"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { Pencil, Trash2, Shield } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// services
import { IAMService } from "@/services/iam.service";
// types
import type { IPolicy } from "@plane/permissions";

const iamService = new IAMService();

type Props = {
  workspaceSlug: string;
  onEditPolicy: (policyId: string) => void;
  onCreatePolicy: () => void;
};

export const IAMPoliciesList = observer(function IAMPoliciesList({
  workspaceSlug,
  onEditPolicy,
  onCreatePolicy,
}: Props) {
  const [policies, setPolicies] = useState<IPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { t } = useTranslation();

  // Fetch policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setIsLoading(true);
        const data = await iamService.fetchPolicies(workspaceSlug);
        setPolicies(data);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("workspace_settings.settings.iam.toasts.error.title"),
          message: t("workspace_settings.settings.iam.toasts.load_error.message"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicies();
  }, [workspaceSlug]);

  const handleDelete = async (policyId: string) => {
    if (!confirm(t("workspace_settings.settings.iam.policies.delete_confirm.message"))) return;

    try {
      setDeletingId(policyId);
      await iamService.deletePolicy(workspaceSlug, policyId);
      setPolicies((prev) => prev.filter((p) => p.id !== policyId));
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("workspace_settings.settings.iam.toasts.policy_deleted.title"),
        message: t("workspace_settings.settings.iam.toasts.policy_deleted.message"),
      });
    } catch (error) {
      console.error("Failed to delete policy:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: t("workspace_settings.settings.iam.toasts.error.message"),
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="h-full w-full flex items-center justify-center">
          <EmptyStateCompact
            assetKey="settings"
            title={t("workspace_settings.empty_state.iam.title")}
            description={t("workspace_settings.empty_state.iam.description")}
            actions={[
              {
                label: t("workspace_settings.empty_state.iam.cta_primary"),
                onClick: onCreatePolicy,
              },
            ]}
            align="start"
            rootClassName="py-20"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <div
          key={policy.id}
          className="flex items-center justify-between p-4 rounded-lg border border-subtle bg-surface-1 hover:bg-surface-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{policy.name}</h4>
              {policy.description && (
                <p className="text-xs text-tertiary truncate mt-0.5">{policy.description}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-tertiary">
                <span>
                  {policy.document?.statements?.length || 0} statement
                  {(policy.document?.statements?.length || 0) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditPolicy(policy.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(policy.id)}
              disabled={deletingId === policy.id}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
});
