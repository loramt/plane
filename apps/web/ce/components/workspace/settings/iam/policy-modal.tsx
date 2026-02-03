"use client";

import { useState, useEffect, useMemo } from "react";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { Plus, Trash2, Code, Settings } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EModalWidth, ModalCore, Input, TextArea, CustomSelect } from "@plane/ui";
// services
import { IAMService } from "@/services/iam.service";
// types
import type { IStatement, TEffect } from "@plane/permissions";

const iamService = new IAMService();

// Available actions grouped
const AVAILABLE_ACTIONS = [
  { group: "project", actions: ["project:read", "project:create", "project:update", "project:delete"] },
  { group: "issue", actions: ["issue:read", "issue:create", "issue:update", "issue:delete"] },
  { group: "cycle", actions: ["cycle:read", "cycle:create", "cycle:update", "cycle:delete"] },
  { group: "module", actions: ["module:read", "module:create", "module:update", "module:delete"] },
  { group: "page", actions: ["page:read", "page:create", "page:update", "page:delete"] },
  { group: "view", actions: ["view:read", "view:create", "view:update", "view:delete"] },
  { group: "member", actions: ["member:read", "member:create", "member:update", "member:delete"] },
  { group: "label", actions: ["label:read", "label:create", "label:update", "label:delete"] },
  { group: "state", actions: ["state:read", "state:create", "state:update", "state:delete"] },
  { group: "comment", actions: ["comment:read", "comment:create", "comment:update", "comment:delete"] },
  { group: "attachment", actions: ["attachment:read", "attachment:create", "attachment:delete"] },
];

// All actions flattened
const ALL_ACTIONS_LIST = AVAILABLE_ACTIONS.flatMap((g) => g.actions);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  policyId: string | null;
};

type StatementForm = {
  sid: string;
  effect: TEffect;
  actions: string[];
};

type FormData = {
  name: string;
  description: string;
};

type ViewMode = "gui" | "json";

export const PolicyModal = observer(function PolicyModal({
  isOpen,
  onClose,
  workspaceSlug,
  policyId,
}: Props) {
  const [statements, setStatements] = useState<StatementForm[]>([
    { sid: "Statement1", effect: "allow", actions: ["*"] },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("gui");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { t } = useTranslation();
  const isEditing = !!policyId;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const nameValue = watch("name");

  // Generate JSON from current form state
  const policyDocument = useMemo(() => ({
    statements: statements.map((s) => ({
      sid: s.sid,
      effect: s.effect,
      actions: s.actions,
      resources: ["*"],
    })),
  }), [statements]);

  // Update JSON text when switching to JSON view or when form changes
  useEffect(() => {
    if (viewMode === "json") {
      setJsonText(JSON.stringify(policyDocument, null, 2));
      setJsonError(null);
    }
  }, [viewMode, policyDocument]);

  // Fetch policy data if editing
  useEffect(() => {
    if (isOpen && policyId) {
      const fetchPolicy = async () => {
        try {
          setIsFetching(true);
          const policy = await iamService.fetchPolicy(workspaceSlug, policyId);
          reset({
            name: policy.name,
            description: policy.description || "",
          });
          if (policy.document?.statements) {
            setStatements(
              policy.document.statements.map((s: IStatement, idx: number) => ({
                sid: s.sid || `Statement${idx + 1}`,
                effect: s.effect,
                actions: s.actions,
              }))
            );
          }
        } catch (error) {
          console.error("Failed to fetch policy:", error);
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("workspace_settings.settings.iam.toasts.error.title"),
            message: t("workspace_settings.settings.iam.toasts.load_error.message"),
          });
        } finally {
          setIsFetching(false);
        }
      };

      fetchPolicy();
    } else if (isOpen) {
      // Reset form for new policy
      reset({ name: "", description: "" });
      setStatements([{ sid: "Statement1", effect: "allow", actions: ["*"] }]);
      setViewMode("gui");
      setJsonError(null);
    }
  }, [isOpen, policyId, workspaceSlug, reset]);

  // Parse JSON and update form state
  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.statements && Array.isArray(parsed.statements)) {
        setStatements(
          parsed.statements.map((s: any, idx: number) => ({
            sid: s.sid || `Statement${idx + 1}`,
            effect: s.effect || "allow",
            actions: s.actions || [],
          }))
        );
        setJsonError(null);
      } else {
        setJsonError("Invalid policy document: missing statements array");
      }
    } catch (e) {
      setJsonError("Invalid JSON syntax");
    }
  };

  const handleAddStatement = () => {
    setStatements((prev) => [
      ...prev,
      { sid: `Statement${prev.length + 1}`, effect: "allow", actions: ["*"] },
    ]);
  };

  const handleRemoveStatement = (index: number) => {
    setStatements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatementChange = (index: number, field: keyof StatementForm, value: any) => {
    setStatements((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleActionToggle = (statementIndex: number, action: string) => {
    setStatements((prev) =>
      prev.map((s, i) => {
        if (i !== statementIndex) return s;
        const hasAction = s.actions.includes(action);
        return {
          ...s,
          actions: hasAction
            ? s.actions.filter((a) => a !== action)
            : [...s.actions, action],
        };
      })
    );
  };

  const handleSelectAllInGroup = (statementIndex: number, groupActions: string[]) => {
    setStatements((prev) =>
      prev.map((s, i) => {
        if (i !== statementIndex) return s;
        const allSelected = groupActions.every((a) => s.actions.includes(a));
        if (allSelected) {
          return {
            ...s,
            actions: s.actions.filter((a) => !groupActions.includes(a)),
          };
        } else {
          const newActions = new Set([...s.actions, ...groupActions]);
          return { ...s, actions: Array.from(newActions) };
        }
      })
    );
  };

  const handleToggleAll = (statementIndex: number) => {
    setStatements((prev) =>
      prev.map((s, i) => {
        if (i !== statementIndex) return s;
        // If currently "all" (*), switch to empty; otherwise switch to "*"
        const isAll = s.actions.includes("*");
        return { ...s, actions: isAll ? [] : ["*"] };
      })
    );
  };

  // Helper to check if a statement has all actions (either "*" or all individual actions)
  const isAllActions = (actions: string[]) => {
    return actions.includes("*") || ALL_ACTIONS_LIST.every((a) => actions.includes(a));
  };

  // Helper to check if action is selected (handles "*" wildcard)
  const isActionSelected = (actions: string[], action: string) => {
    return actions.includes("*") || actions.includes(action);
  };

  const onSubmit = async (formData: FormData) => {
    if (viewMode === "json" && jsonError) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: jsonError,
      });
      return;
    }

    if (statements.some((s) => s.actions.length === 0)) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: "Each statement must have at least one action",
      });
      return;
    }

    try {
      setIsLoading(true);

      const policyData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        document: policyDocument,
      };

      if (isEditing) {
        await iamService.updatePolicy(workspaceSlug, policyId, policyData);
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("workspace_settings.settings.iam.toasts.policy_updated.title"),
          message: t("workspace_settings.settings.iam.toasts.policy_updated.message"),
        });
      } else {
        await iamService.createPolicy(workspaceSlug, policyData);
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("workspace_settings.settings.iam.toasts.policy_created.title"),
          message: t("workspace_settings.settings.iam.toasts.policy_created.message"),
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save policy:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_settings.settings.iam.toasts.error.title"),
        message: t("workspace_settings.settings.iam.toasts.error.message"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} width={EModalWidth.XXXXL}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
        <h2 className="text-lg font-medium">
          {isEditing ? t("workspace_settings.settings.iam.policies.edit") + " Policy" : t("workspace_settings.settings.iam.add_policy")}
        </h2>
        <div className="flex items-center gap-1 p-1 rounded-md bg-surface-2">
          <button
            type="button"
            onClick={() => setViewMode("gui")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === "gui" ? "bg-surface-1 shadow-sm" : "text-tertiary hover:text-secondary"
            }`}
          >
            <Settings className="h-4 w-4" />
            Builder
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === "json" ? "bg-surface-1 shadow-sm" : "text-tertiary hover:text-secondary"
            }`}
          >
            <Code className="h-4 w-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
        {isFetching ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic info - same structure as General settings */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <h4 className="text-body-xs-regular text-tertiary">
                  {t("workspace_settings.settings.iam.policies.name")} *
                </h4>
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    required: "Policy name is required",
                    maxLength: {
                      value: 255,
                      message: "Name should be less than 255 characters",
                    },
                  }}
                  render={({ field: { value, onChange, ref } }) => (
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={value}
                      onChange={onChange}
                      ref={ref}
                      hasError={Boolean(errors.name)}
                      placeholder={t("workspace_settings.settings.iam.policies.name_placeholder")}
                      className="w-full rounded-md"
                    />
                  )}
                />
                {errors.name && (
                  <span className="text-xs text-red-500">{errors.name.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <h4 className="text-body-xs-regular text-tertiary">
                  {t("workspace_settings.settings.iam.policies.description")}
                </h4>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { value, onChange } }) => (
                    <TextArea
                      value={value}
                      onChange={onChange}
                      placeholder={t("workspace_settings.settings.iam.policies.description_placeholder")}
                      className="w-full min-h-[38px] resize-none rounded-md"
                      rows={1}
                    />
                  )}
                />
              </div>
            </div>

            {/* GUI View */}
            {viewMode === "gui" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-body-xs-regular text-tertiary">
                    {t("workspace_settings.settings.iam.policies.statements")}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={handleAddStatement}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("workspace_settings.settings.iam.policies.add_statement")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {statements.map((statement, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-subtle rounded-lg bg-layer-1"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-body-xs-regular text-tertiary">ID</h4>
                            <Input
                              type="text"
                              value={statement.sid}
                              onChange={(e) =>
                                handleStatementChange(idx, "sid", e.target.value)
                              }
                              className="w-32 rounded-md"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <h4 className="text-body-xs-regular text-tertiary">
                              {t("workspace_settings.settings.iam.policies.statement.effect")}
                            </h4>
                            <CustomSelect
                              value={statement.effect}
                              onChange={(val: TEffect) => handleStatementChange(idx, "effect", val)}
                              label={
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                  statement.effect === "allow"
                                    ? "bg-green-500/10 text-green-600"
                                    : "bg-red-500/10 text-red-600"
                                }`}>
                                  {statement.effect === "allow"
                                    ? t("workspace_settings.settings.iam.policies.statement.allow")
                                    : t("workspace_settings.settings.iam.policies.statement.deny")}
                                </span>
                              }
                              buttonClassName="border border-subtle bg-layer-2 !shadow-none !rounded-md"
                            >
                              <CustomSelect.Option value="allow">
                                <span className="text-green-600">{t("workspace_settings.settings.iam.policies.statement.allow")}</span>
                              </CustomSelect.Option>
                              <CustomSelect.Option value="deny">
                                <span className="text-red-600">{t("workspace_settings.settings.iam.policies.statement.deny")}</span>
                              </CustomSelect.Option>
                            </CustomSelect>
                          </div>
                        </div>
                        {statements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStatement(idx)}
                            className="text-tertiary hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <h4 className="text-body-xs-regular text-tertiary">
                          {t("workspace_settings.settings.iam.policies.statement.actions")}
                        </h4>

                        {/* All checkbox */}
                        <div className="flex items-center gap-2 pb-2 border-b border-subtle">
                          <input
                            type="checkbox"
                            checked={isAllActions(statement.actions)}
                            onChange={() => handleToggleAll(idx)}
                            className="rounded border-subtle"
                          />
                          <span className="text-sm font-medium">
                            {t("workspace_settings.settings.iam.policies.statement.all_actions")}
                          </span>
                        </div>

                        {/* Individual action groups - only show when not "all" */}
                        {!statement.actions.includes("*") && AVAILABLE_ACTIONS.map((group) => {
                          const allGroupSelected = group.actions.every((a) =>
                            isActionSelected(statement.actions, a)
                          );
                          const someGroupSelected = group.actions.some((a) =>
                            isActionSelected(statement.actions, a)
                          );

                          return (
                            <div key={group.group}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someGroupSelected && !allGroupSelected;
                                  }}
                                  onChange={() =>
                                    handleSelectAllInGroup(idx, group.actions)
                                  }
                                  className="rounded border-subtle"
                                />
                                <span className="text-body-xs-regular text-tertiary capitalize">
                                  {group.group}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 ml-5">
                                {group.actions.map((action) => {
                                  const isSelected = isActionSelected(statement.actions, action);
                                  const actionName = action.split(":")[1];
                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => handleActionToggle(idx, action)}
                                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                                        isSelected
                                          ? "bg-success-subtle text-success-primary border-success-subtle"
                                          : "bg-danger-subtle text-danger-primary border-danger-subtle"
                                      }`}
                                    >
                                      {actionName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON View */}
            {viewMode === "json" && (
              <div className="flex flex-col gap-1">
                <h4 className="text-body-xs-regular text-tertiary">Policy Document (JSON)</h4>
                <div className={`relative rounded-md border ${jsonError ? "border-red-500" : "border-subtle"} overflow-hidden`}>
                  <CodeMirror
                    value={jsonText}
                    height="384px"
                    extensions={[json()]}
                    onChange={(value) => handleJsonChange(value)}
                    theme="dark"
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                      highlightActiveLineGutter: true,
                      highlightActiveLine: true,
                      bracketMatching: true,
                      autocompletion: true,
                    }}
                  />
                </div>
                {jsonError && (
                  <span className="text-xs text-red-500">{jsonError}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-subtle">
        <Button variant="secondary" size="lg" onClick={onClose}>
          {t("workspace_settings.settings.iam.policies.cancel")}
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isFetching || !nameValue?.trim() || (viewMode === "json" && !!jsonError)}
        >
          {isLoading ? t("workspace_settings.settings.iam.policies.saving") : t("workspace_settings.settings.iam.policies.save")}
        </Button>
      </div>
    </ModalCore>
  );
});
