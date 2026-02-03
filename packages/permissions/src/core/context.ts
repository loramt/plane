/**
 * Context building utilities for IAM.
 * INTERNAL MODULE - use the hooks from index.ts instead.
 */

import type { IActor, IEvaluationContext, IResource } from "../types";

/**
 * Build an evaluation context from actor and resource
 */
export function buildContext(actor: IActor, resource?: Partial<IResource>): IEvaluationContext {
  // Build group object only with defined values
  const group: { id?: string; name?: string } = {};
  if (resource?.project_group_id) group.id = resource.project_group_id;
  if (resource?.project_group_name) group.name = resource.project_group_name;

  // Build resource object only with defined values
  const resourceContext: IEvaluationContext["resource"] = {
    group,
  };

  if (resource?.workspace_id) resourceContext.workspace_id = resource.workspace_id;
  if (resource?.workspace_slug) resourceContext.workspace_slug = resource.workspace_slug;
  if (resource?.project_id) resourceContext.project_id = resource.project_id;
  if (resource?.id) resourceContext.id = resource.id;
  if (resource?.type) resourceContext.type = resource.type;
  if (resource?.created_by) resourceContext.created_by = resource.created_by;

  // Add any additional properties from resource
  if (resource) {
    const excludedKeys = [
      "workspace_id",
      "workspace_slug",
      "project_id",
      "project_group_id",
      "project_group_name",
      "id",
      "type",
      "created_by",
    ];
    for (const [key, value] of Object.entries(resource)) {
      if (!excludedKeys.includes(key) && value !== undefined) {
        resourceContext[key] = value;
      }
    }
  }

  return {
    actor: {
      id: actor.id,
      email: actor.email,
      groups: actor.groups || [],
    },
    resource: resourceContext,
  };
}

/**
 * Merge partial resource with defaults from route context
 */
export function mergeResourceWithDefaults(
  resource: Partial<IResource> | undefined,
  defaults: Partial<IResource>
): IResource {
  return {
    ...defaults,
    ...resource,
  };
}
