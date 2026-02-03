import { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import type { Control, FieldArrayWithId, FormState } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Shield, Check, ChevronDown, X } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { IPolicy } from "@plane/permissions";
import { CloseIcon } from "@plane/propel/icons";
import { Input } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import type { InvitationFormValues } from "@/hooks/use-workspace-invitation";
// services
import { IAMService } from "@/services/iam.service";

const iamService = new IAMService();

type TInvitationFieldsProps = {
  workspaceSlug: string;
  fields: FieldArrayWithId<InvitationFormValues, "emails", "id">[];
  control: Control<InvitationFormValues>;
  formState: FormState<InvitationFormValues>;
  remove: (index: number) => void;
  className?: string;
};

type PolicyMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  policies: IPolicy[];
  loading: boolean;
  placeholder: string;
};

const PolicyMultiSelect = ({ value, onChange, policies, loading, placeholder }: PolicyMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedPolicies = policies.filter((p) => value?.includes(p.id));
  const unselectedPolicies = policies.filter((p) => !value?.includes(p.id));

  const handleSelect = (policyId: string) => {
    onChange([...(value || []), policyId]);
  };

  const handleRemove = (policyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value?.filter((id) => id !== policyId) || []);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Select trigger - matches Plane's CustomSelect button style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-1 rounded-md border border-subtle px-3 py-2 text-left text-13 text-secondary shadow-sm duration-300 hover:bg-layer-1 hover:text-primary focus:outline-none",
          isOpen && "bg-layer-1 text-primary"
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 min-w-0 items-center">
          {loading ? (
            <span className="text-13 text-tertiary">Loading...</span>
          ) : selectedPolicies.length === 0 ? (
            <span className="text-13 text-tertiary">{placeholder}</span>
          ) : (
            selectedPolicies.map((policy) => (
              <span
                key={policy.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-subtle bg-layer-2 text-11 text-secondary"
              >
                {policy.name}
                <button
                  type="button"
                  onClick={(e) => handleRemove(policy.id, e)}
                  className="hover:text-primary rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <ChevronDown className={cn(
          "h-3 w-3 shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown - matches Plane's CustomSelect options style */}
      {isOpen && !loading && (
        <div className="absolute z-30 mt-1 w-full rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 shadow-sm">
          {unselectedPolicies.length === 0 && selectedPolicies.length === policies.length ? (
            <div className="px-1 py-1.5 text-11 text-tertiary">
              All policies selected
            </div>
          ) : unselectedPolicies.length === 0 && policies.length === 0 ? (
            <div className="px-1 py-1.5 text-11 text-tertiary">
              No policies available
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {unselectedPolicies.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => handleSelect(policy.id)}
                  className="flex items-center gap-2 w-full px-1 py-1.5 text-left text-secondary rounded-sm hover:bg-layer-transparent-hover transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-tertiary shrink-0" />
                  <span className="text-11">{policy.name}</span>
                  {policy.is_managed && (
                    <span className="text-11 text-tertiary">(Default)</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const InvitationFields = observer(function InvitationFields(props: TInvitationFieldsProps) {
  const {
    workspaceSlug,
    fields,
    control,
    formState: { errors },
    remove,
    className,
  } = props;
  // plane hooks
  const { t } = useTranslation();

  // State for available policies
  const [availablePolicies, setAvailablePolicies] = useState<IPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  // Fetch policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setPoliciesLoading(true);
        const policies = await iamService.fetchPoliciesForInvitation(workspaceSlug);
        setAvailablePolicies(policies);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      } finally {
        setPoliciesLoading(false);
      }
    };
    fetchPolicies();
  }, [workspaceSlug]);

  return (
    <div className={cn("mb-3 space-y-3", className)}>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start gap-3"
        >
          {/* Email input */}
          <div className="flex-1 min-w-0">
            <Controller
              control={control}
              name={`emails.${index}.email`}
              rules={{
                required: t("workspace_settings.settings.members.modal.errors.required"),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t("workspace_settings.settings.members.modal.errors.invalid"),
                },
              }}
              render={({ field: { value, onChange, ref } }) => (
                <>
                  <Input
                    id={`emails.${index}.email`}
                    name={`emails.${index}.email`}
                    type="text"
                    value={value}
                    onChange={onChange}
                    ref={ref}
                    hasError={Boolean(errors.emails?.[index]?.email)}
                    placeholder={t("workspace_settings.settings.members.modal.placeholder")}
                    className="w-full text-sm"
                  />
                  {errors.emails?.[index]?.email && (
                    <span className="text-xs text-danger-primary mt-1">
                      {errors.emails?.[index]?.email?.message}
                    </span>
                  )}
                </>
              )}
            />
          </div>

          {/* Policy multi-select */}
          <div className="w-64 shrink-0">
            <Controller
              control={control}
              name={`emails.${index}.policy_ids`}
              render={({ field: { value, onChange } }) => (
                <PolicyMultiSelect
                  value={value || []}
                  onChange={onChange}
                  policies={availablePolicies}
                  loading={policiesLoading}
                  placeholder={t("workspace_settings.settings.members.modal.select_policies")}
                />
              )}
            />
          </div>

          {/* Remove button */}
          {fields.length > 1 && (
            <button
              type="button"
              className="p-2 rounded-md hover:bg-surface-2 transition-colors shrink-0"
              onClick={() => remove(index)}
            >
              <CloseIcon className="h-4 w-4 text-secondary" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
});
