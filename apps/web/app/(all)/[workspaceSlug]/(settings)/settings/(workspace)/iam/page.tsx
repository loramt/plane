"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { useCan } from "@plane/permissions";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
// plane-web components
import { IAMPoliciesList } from "@/plane-web/components/workspace/settings/iam/policies-list";
import { PolicyModal } from "@/plane-web/components/workspace/settings/iam/policy-modal";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useIAM } from "@/hooks/store/use-iam";
// types
import type { Route } from "./+types/page";

const IAMSettingsPage = observer(function IAMSettingsPage({ params }: Route.ComponentProps) {
  // states
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // router
  const { workspaceSlug } = params;

  // plane hooks
  const { t } = useTranslation();

  // store hooks
  const { currentWorkspace } = useWorkspace();
  const { myPolicies, actor, isOwner, fetchMyPolicies, isLoading } = useIAM();

  // Fetch IAM policies on mount
  useEffect(() => {
    if (workspaceSlug) {
      fetchMyPolicies(workspaceSlug);
    }
  }, [workspaceSlug]);

  // IAM permission check
  const { can } = useCan({
    actor,
    policies: myPolicies,
    workspaceSlug,
    isOwner,
  });

  // Check if user can manage IAM (owner always can)
  const canManageIAM = can("iam:manage");

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

  // Show loading while fetching policies
  if (isLoading) {
    return (
      <SettingsContentWrapper size="lg">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SettingsContentWrapper>
    );
  }

  // if user is not authorized to view this page
  if (!canManageIAM) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper size="lg">
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
          button={{
            label: t("workspace_settings.settings.iam.add_policy"),
            onClick: handleCreatePolicy,
          }}
        />

        {/* Policies List */}
        <div className="mt-4">
          <IAMPoliciesList
            workspaceSlug={workspaceSlug}
            onEditPolicy={handleEditPolicy}
            onCreatePolicy={handleCreatePolicy}
          />
        </div>
      </div>
    </SettingsContentWrapper>
  );
});

export default IAMSettingsPage;
