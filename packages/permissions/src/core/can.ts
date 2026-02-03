/**
 * Core permission check function.
 * This is the pure function version - for React components, use the useCan hook.
 */

import type { IActor, IPolicyDocument, IResource } from "../types";
import { buildContext } from "./context";
import { getEngine } from "./engine";

/**
 * Check if an actor can perform an action on a resource.
 *
 * This is a pure function that performs the permission check.
 * For React components, prefer using the `useCan` hook which handles
 * loading policies and building context automatically.
 *
 * @param action - The action to check (e.g., "project:delete")
 * @param resource - The resource being acted upon
 * @param policies - List of policy documents to evaluate
 * @param actor - The actor performing the action
 * @returns true if the action is allowed, false otherwise
 *
 * @example
 * const allowed = can(
 *   "project:delete",
 *   { project_id: "123", workspace_slug: "my-workspace" },
 *   myPolicies,
 *   { id: "user-1", email: "user@example.com" }
 * );
 */
export function can(
  action: string,
  resource: IResource,
  policies: IPolicyDocument[],
  actor: IActor
): boolean {
  // If no policies, allow by default (backward compatibility)
  if (!policies || policies.length === 0) {
    return true;
  }

  // Build context
  const context = buildContext(actor, resource);

  // Evaluate
  const engine = getEngine();
  return engine.evaluate(policies, action, context);
}

/**
 * Create a permission checker bound to a specific actor and policies.
 * Useful for checking multiple permissions without repeating actor/policies.
 *
 * @example
 * const checker = createPermissionChecker(actor, policies);
 * const canRead = checker("project:read", project);
 * const canDelete = checker("project:delete", project);
 */
export function createPermissionChecker(actor: IActor, policies: IPolicyDocument[]) {
  return (action: string, resource: IResource): boolean => {
    return can(action, resource, policies, actor);
  };
}
