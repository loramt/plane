"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import { FileText, Users } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
// plane-web components
import { IAMPoliciesList } from "@/plane-web/components/workspace/settings/iam/policies-list";
import { IAMUserPolicies } from "@/plane-web/components/workspace/settings/iam/user-policies";
import { PolicyModal } from "@/plane-web/components/workspace/settings/iam/policy-modal";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserPermissions } from "@/hooks/store/user";
// types
import type { Route } from "./+types/page";

type TabType = "policies" | "users";

const IAMSettingsPage = observer(function IAMSettingsPage({ params }: Route.ComponentProps) {
  // states
  const [activeTab, setActiveTab] = useState<TabType>("policies");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // router
  const { workspaceSlug } = params;

  // plane hooks
  const { t } = useTranslation();

  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { currentWorkspace } = useWorkspace();

  // derived values
  const canPerformWorkspaceAdminActions = allowPermissions(
    [EUserPermissions.ADMIN],
    EUserPermissionsLevel.WORKSPACE
  );

  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace.name} - ${t("workspace_settings.settings.iam.title")}`
    : undefined;

  // handlers
  const handleCreatePolicy = () => {
    setEditingPolicyId(null);
    setIsPolicyModalOpen(true);
  };

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPolicyModalOpen(false);
    setEditingPolicyId(null);
  };

  // if user is not authorized to view this page
  if (workspaceUserInfo && !canPerformWorkspaceAdminActions) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper>
      <PageHead title={pageTitle} />

      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={handleCloseModal}
        workspaceSlug={workspaceSlug}
        policyId={editingPolicyId}
      />

      <div className="w-full">
        <SettingsHeading
          title={t("workspace_settings.settings.iam.heading")}
          description={t("workspace_settings.settings.iam.description")}
          button={
            activeTab === "policies"
              ? {
                  label: t("workspace_settings.settings.iam.add_policy"),
                  onClick: handleCreatePolicy,
                }
              : undefined
          }
          showButton={activeTab === "policies"}
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-subtle mt-4">
          <button
            onClick={() => setActiveTab("policies")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === "policies"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-tertiary hover:text-primary"
            }`}
          >
            <FileText className="h-4 w-4" />
            {t("workspace_settings.settings.iam.tabs.policies")}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-tertiary hover:text-primary"
            }`}
          >
            <Users className="h-4 w-4" />
            {t("workspace_settings.settings.iam.tabs.users")}
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          {activeTab === "policies" ? (
            <IAMPoliciesList
              workspaceSlug={workspaceSlug}
              onEditPolicy={handleEditPolicy}
              onCreatePolicy={handleCreatePolicy}
            />
          ) : (
            <IAMUserPolicies workspaceSlug={workspaceSlug} />
          )}
        </div>
      </div>
    </SettingsContentWrapper>
  );
});

export default IAMSettingsPage;
