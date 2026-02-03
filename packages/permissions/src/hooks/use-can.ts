/**
 * React hook for permission checks.
 *
 * This hook provides a simple interface for checking permissions in React components.
 * It automatically loads policies from the store and builds the evaluation context.
 */

import { useCallback, useMemo } from "react";
import type { IActor, IPolicyDocument, IResource } from "../types";
import { can as canCore } from "../core/can";
import { mergeResourceWithDefaults } from "../core/context";

/**
 * Options for useCan hook
 */
export interface UseCanOptions {
  /** Current user/actor */
  actor: IActor | null;
  /** User's policies */
  policies: IPolicyDocument[];
  /** Default workspace slug from route */
  workspaceSlug?: string;
  /** Default project ID from route */
  projectId?: string;
  /** If true, user is workspace owner (root account) and bypasses all checks */
  isOwner?: boolean;
}

/**
 * Return type for useCan hook
 */
export interface UseCanReturn {
  /**
   * Check if the current user can perform an action.
   *
   * @param action - The action to check (e.g., "project:delete", "issue:create")
   * @param resource - Optional resource-specific context
   * @returns true if allowed, false otherwise
   *
   * @example
   * const { can } = useCan({ actor, policies, workspaceSlug });
   *
   * // Basic check
   * if (can("project:delete")) { ... }
   *
   * // With specific resource
   * if (can("issue:create", { project_id: "123" })) { ... }
   *
   * // With full resource context
   * if (can("issue:update", { id: issue.id, created_by: issue.created_by })) { ... }
   */
  can: (action: string, resource?: Partial<IResource>) => boolean;

  /**
   * Check multiple permissions at once.
   * Returns an object mapping actions to their permission status.
   *
   * @example
   * const perms = canAll(["project:read", "project:update", "project:delete"]);
   * // { "project:read": true, "project:update": true, "project:delete": false }
   */
  canAll: (actions: string[], resource?: Partial<IResource>) => Record<string, boolean>;

  /**
   * Check if any of the given actions is allowed.
   *
   * @example
   * if (canAny(["project:update", "project:delete"])) {
   *   // Show edit menu
   * }
   */
  canAny: (actions: string[], resource?: Partial<IResource>) => boolean;
}

/**
 * Hook for checking IAM permissions in React components.
 *
 * This hook provides a simple `can()` function that checks if the current user
 * is allowed to perform an action. It automatically handles loading policies
 * and building the evaluation context.
 *
 * @example
 * function ProjectActions({ project }) {
 *   const { can } = useCan({
 *     actor: currentUser,
 *     policies: myPolicies,
 *     workspaceSlug: "my-workspace",
 *   });
 *
 *   return (
 *     <div>
 *       {can("project:update", project) && <EditButton />}
 *       {can("project:delete", project) && <DeleteButton />}
 *     </div>
 *   );
 * }
 */
export function useCan(options: UseCanOptions): UseCanReturn {
  const { actor, policies, workspaceSlug, projectId, isOwner = false } = options;

  // Memoize default resource context
  const defaultResource = useMemo(
    () => ({
      ...(workspaceSlug ? { workspace_slug: workspaceSlug } : {}),
      ...(projectId ? { project_id: projectId } : {}),
    }),
    [workspaceSlug, projectId]
  );

  // Main permission check function
  const can = useCallback(
    (action: string, resource?: Partial<IResource>): boolean => {
      // If no actor, deny
      if (!actor) {
        return false;
      }

      // Root account bypass - workspace owner has full access
      if (isOwner) {
        return true;
      }

      // If no policies, deny (users must have explicit permissions)
      if (!policies || policies.length === 0) {
        return false;
      }

      // Merge resource with defaults
      const fullResource = mergeResourceWithDefaults(resource, defaultResource);

      return canCore(action, fullResource, policies, actor);
    },
    [actor, policies, defaultResource, isOwner]
  );

  // Check multiple permissions
  const canAll = useCallback(
    (actions: string[], resource?: Partial<IResource>): Record<string, boolean> => {
      const result: Record<string, boolean> = {};
      for (const action of actions) {
        result[action] = can(action, resource);
      }
      return result;
    },
    [can]
  );

  // Check if any permission is allowed
  const canAny = useCallback(
    (actions: string[], resource?: Partial<IResource>): boolean => {
      return actions.some((action) => can(action, resource));
    },
    [can]
  );

  return { can, canAll, canAny };
}

/**
 * Factory function to create a useCan hook with pre-configured options.
 * Useful for creating workspace or project-specific hooks.
 *
 * @example
 * // In your app
 * export const useProjectCan = createUseCanHook(() => {
 *   const { currentUser } = useUserStore();
 *   const { myPolicies } = useIAMStore();
 *   const { workspaceSlug, projectId } = useParams();
 *
 *   return {
 *     actor: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
 *     policies: myPolicies,
 *     workspaceSlug,
 *     projectId,
 *   };
 * });
 *
 * // In component
 * const { can } = useProjectCan();
 * if (can("issue:create")) { ... }
 */
export function createUseCanHook(getOptions: () => UseCanOptions) {
  return function useCanWithContext(): UseCanReturn {
    const options = getOptions();
    return useCan(options);
  };
}
