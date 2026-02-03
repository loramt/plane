"""
Context building and policy loading for IAM.
INTERNAL MODULE - not exposed directly, use service.py functions.
"""
from functools import lru_cache
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from django.core.cache import cache

from .types import EvaluationContext, PolicyDocument

if TYPE_CHECKING:
    from plane.db.models import User, Policy


# Cache timeout for user policies (5 minutes)
POLICY_CACHE_TIMEOUT = 300


def build_context(user: "User", resource: Any, workspace_slug: str = None) -> EvaluationContext:
    """
    Build evaluation context from user and resource.
    Automatically extracts relevant information from the resource.

    Args:
        user: The user performing the action
        resource: The resource being acted upon (Project, Issue, Page, etc.)
        workspace_slug: Optional workspace slug override

    Returns:
        EvaluationContext populated with actor and resource information
    """
    from plane.db.models import GroupMember

    # Get user's IAM groups
    user_groups = list(
        GroupMember.objects.filter(
            member=user,
            deleted_at__isnull=True
        ).values_list("group__name", flat=True)
    )

    # Start building context
    context = EvaluationContext(
        actor_id=str(user.id),
        actor_email=user.email,
        actor_groups=user_groups,
    )

    # Extract workspace info
    if workspace_slug:
        context.workspace_slug = workspace_slug

    # Extract resource-specific information
    if resource is not None:
        context = _extract_resource_info(context, resource)

    return context


def _extract_resource_info(context: EvaluationContext, resource: Any) -> EvaluationContext:
    """
    Extract information from the resource and populate context.
    Handles different resource types (Project, Issue, Page, etc.)
    """
    # Get resource type
    resource_type = type(resource).__name__.lower()
    context.resource_type = resource_type

    # Get resource ID
    if hasattr(resource, "id"):
        context.resource_id = str(resource.id)

    # Get created_by
    if hasattr(resource, "created_by_id"):
        context.resource_created_by = str(resource.created_by_id)
    elif hasattr(resource, "created_by") and resource.created_by:
        context.resource_created_by = str(resource.created_by.id)

    # Get workspace info
    if hasattr(resource, "workspace"):
        workspace = resource.workspace
        if workspace:
            context.workspace_id = str(workspace.id)
            context.workspace_slug = workspace.slug
    elif hasattr(resource, "workspace_id"):
        context.workspace_id = str(resource.workspace_id)

    # Get project info (for project-level resources)
    if hasattr(resource, "project"):
        project = resource.project
        if project:
            context.project_id = str(project.id)
            if project.project_group:
                context.project_group_id = str(project.project_group.id)
                context.project_group_name = project.project_group.name
    elif hasattr(resource, "project_id") and resource.project_id:
        context.project_id = str(resource.project_id)

    # If resource IS a project
    if resource_type == "project":
        context.project_id = str(resource.id)
        if hasattr(resource, "project_group") and resource.project_group:
            context.project_group_id = str(resource.project_group.id)
            context.project_group_name = resource.project_group.name

    # Extract additional attributes based on resource type
    context.resource_attributes = _get_resource_attributes(resource, resource_type)

    return context


def _get_resource_attributes(resource: Any, resource_type: str) -> Dict[str, Any]:
    """
    Extract type-specific attributes from resource.
    """
    attributes = {}

    # Common attributes
    if hasattr(resource, "name"):
        attributes["name"] = resource.name

    # Issue-specific
    if resource_type == "issue":
        if hasattr(resource, "priority"):
            attributes["priority"] = resource.priority
        if hasattr(resource, "state") and resource.state:
            attributes["state"] = resource.state.name
            attributes["state_group"] = resource.state.group

    # Project-specific
    if resource_type == "project":
        if hasattr(resource, "network"):
            attributes["network"] = resource.network
        if hasattr(resource, "identifier"):
            attributes["identifier"] = resource.identifier

    return attributes


def get_user_policies(user: "User", workspace_slug: str) -> List[PolicyDocument]:
    """
    Get all policies applicable to a user in a workspace.
    Includes both direct user policies and policies from group membership.
    Results are cached for performance.

    Args:
        user: The user to get policies for
        workspace_slug: The workspace slug

    Returns:
        List of PolicyDocument objects
    """
    cache_key = f"iam_policies_{user.id}_{workspace_slug}"

    # Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Load from database
    policies = _load_user_policies(user, workspace_slug)

    # Cache the result
    cache.set(cache_key, policies, POLICY_CACHE_TIMEOUT)

    return policies


def _load_user_policies(user: "User", workspace_slug: str) -> List[PolicyDocument]:
    """
    Load all policies for a user from database.
    """
    from plane.db.models import Policy, UserPolicy, GroupMember, GroupPolicy, Workspace

    try:
        workspace = Workspace.objects.get(slug=workspace_slug, deleted_at__isnull=True)
    except Workspace.DoesNotExist:
        return []

    policy_documents = []
    seen_policy_ids = set()

    # 1. Get direct user policies
    user_policy_ids = UserPolicy.objects.filter(
        user=user,
        workspace=workspace,
        deleted_at__isnull=True
    ).values_list("policy_id", flat=True)

    # 2. Get policies from group membership
    user_group_ids = GroupMember.objects.filter(
        member=user,
        workspace=workspace,
        deleted_at__isnull=True
    ).values_list("group_id", flat=True)

    group_policy_ids = GroupPolicy.objects.filter(
        group_id__in=user_group_ids,
        deleted_at__isnull=True
    ).values_list("policy_id", flat=True)

    # Combine and deduplicate
    all_policy_ids = set(user_policy_ids) | set(group_policy_ids)

    # Load policy documents
    policies = Policy.objects.filter(
        id__in=all_policy_ids,
        deleted_at__isnull=True
    )

    for policy in policies:
        if policy.id not in seen_policy_ids:
            seen_policy_ids.add(policy.id)
            try:
                doc = PolicyDocument.from_dict(policy.document)
                policy_documents.append(doc)
            except (KeyError, TypeError, ValueError):
                # Invalid policy document - skip
                continue

    return policy_documents


def invalidate_user_policies_cache(user_id: str, workspace_slug: str = None):
    """
    Invalidate cached policies for a user.
    Call this when policies, group memberships, or group policies change.

    Args:
        user_id: The user ID
        workspace_slug: Optional workspace slug (if None, invalidates all)
    """
    if workspace_slug:
        cache_key = f"iam_policies_{user_id}_{workspace_slug}"
        cache.delete(cache_key)
    else:
        # Would need pattern-based deletion, not supported by all cache backends
        # For now, rely on timeout
        pass
