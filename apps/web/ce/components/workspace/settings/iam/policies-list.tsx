"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { Pencil, Trash2 } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Table } from "@plane/ui";
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

  const columns = [
    {
      key: "name",
      content: t("workspace_settings.settings.iam.policies.columns.name"),
      thClassName: "text-left",
      tdRender: (policy: IPolicy) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{policy.name}</span>
          {policy.is_managed && (
            <span className="text-10 px-1.5 py-0.5 rounded bg-layer-2 text-tertiary">Default</span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      content: t("workspace_settings.settings.iam.policies.columns.description"),
      thClassName: "text-left",
      tdRender: (policy: IPolicy) => (
        <div className="text-secondary truncate max-w-[300px]">
          {policy.description || "-"}
        </div>
      ),
    },
    {
      key: "users",
      content: t("workspace_settings.settings.iam.policies.columns.users"),
      thClassName: "text-left",
      tdRender: (policy: IPolicy) => (
        <div className="text-secondary">
          {policy.user_count ?? 0}
        </div>
      ),
    },
    {
      key: "actions",
      content: "",
      thClassName: "w-20",
      tdRender: (policy: IPolicy) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEditPolicy(policy.id)}
            className="p-1.5 rounded hover:bg-layer-2 transition-colors"
            title={t("edit")}
          >
            <Pencil className="h-3.5 w-3.5 text-tertiary" />
          </button>
          {!policy.is_managed && (
            <button
              type="button"
              onClick={() => handleDelete(policy.id)}
              disabled={deletingId === policy.id}
              className="p-1.5 rounded hover:bg-layer-2 transition-colors disabled:opacity-50"
              title={t("delete")}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ];

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
    <div className="border-t border-subtle">
      <Table<IPolicy>
        columns={columns}
        data={policies}
        keyExtractor={(policy) => policy.id}
        tHeadClassName="border-b border-subtle"
        thClassName="text-left font-medium divide-x-0 text-placeholder"
        tBodyClassName="divide-y-0"
        tBodyTrClassName="divide-x-0 p-4 h-[40px] text-secondary"
        tHeadTrClassName="divide-x-0"
      />
    </div>
  );
});
