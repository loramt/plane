/**
 * @plane/permissions
 *
 * IAM Permission System for Plane.
 *
 * UNICO PUNTO DI INGRESSO - This file exports only the public API.
 * Internal modules (engine, context, cache) are not exposed directly.
 *
 * Usage:
 *
 * ```tsx
 * import { useCan, can, ACTIONS } from "@plane/permissions";
 *
 * // In React components - use the hook
 * function MyComponent() {
 *   const { can } = useCan({
 *     actor: currentUser,
 *     policies: myPolicies,
 *     workspaceSlug: "my-workspace"
 *   });
 *
 *   if (can(ACTIONS.PROJECT.DELETE, project)) {
 *     return <DeleteButton />;
 *   }
 * }
 *
 * // Outside React - use the pure function
 * const allowed = can("project:delete", resource, policies, actor);
 * ```
 */

// Main hook for React components
export { useCan, createUseCanHook } from "./hooks/use-can";
export type { UseCanOptions, UseCanReturn } from "./hooks/use-can";

// Pure function for non-React usage
export { can, createPermissionChecker } from "./core/can";

// Types
export type {
  TEffect,
  TConditionOperator,
  TConditionBlock,
  IStatement,
  IPolicyDocument,
  IPolicy,
  IGroup,
  IGroupMember,
  IProjectGroup,
  IActor,
  IResource,
  IEvaluationContext,
  IMyPoliciesResponse,
} from "./types";

// Constants
export { ACTIONS } from "./constants";
export type { TAction } from "./constants";

// Cache utilities (for store integration)
export { invalidatePolicyCache } from "./core/cache";
