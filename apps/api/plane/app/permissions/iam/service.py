"""
IAM Permission Service - Public API.

This module provides the public interface for IAM permission checks.
All other modules in this package are internal implementation details.

Usage:
    from plane.app.permissions.iam import can

    if can(request.user, "project:delete", project):
        # User is allowed to delete the project
        project.delete()

Root Account:
    The workspace owner (workspace.owner) is the root account and always
    has full access to everything, bypassing all IAM policy checks.
"""
from typing import Any, Optional, TYPE_CHECKING

from django.core.cache import cache

from .context import build_context, get_user_policies
from .engine import get_engine
from .types import EvaluationContext

if TYPE_CHECKING:
    from plane.db.models import User


def can(
    user: "User",
    action: str,
    resource: Any = None,
    workspace_slug: str = None
) -> bool:
    """
    Check if a user can perform an action on a resource.

    This is the main entry point for IAM permission checks.
    It handles all the complexity of loading policies, building context,
    and evaluating the permission.

    Args:
        user: The user performing the action
        action: The action to check (e.g., "project:delete", "issue:create")
        resource: The resource being acted upon (optional for workspace-level actions)
        workspace_slug: The workspace slug (optional if resource has workspace)

    Returns:
        True if the action is allowed, False otherwise

    Examples:
        # Check if user can delete a project
        if can(request.user, "project:delete", project):
            project.delete()

        # Check if user can create an issue in a project
        if can(request.user, "issue:create", project):
            Issue.objects.create(...)

        # Check workspace-level permission
        if can(request.user, "group:create", workspace_slug="my-workspace"):
            Group.objects.create(...)
    """
    # Extract workspace_slug from resource if not provided
    if workspace_slug is None and resource is not None:
        workspace_slug = _extract_workspace_slug(resource)

    if workspace_slug is None:
        # No workspace context - deny by default
        return False

    # Check if user is the workspace owner (root account)
    # Root account always has full access, bypassing all IAM checks
    if is_workspace_owner(user, workspace_slug):
        return True

    # Load user's policies
    policies = get_user_policies(user, workspace_slug)

    # If user has no IAM policies, deny by default
    # Users must have explicit policies to access resources
    if not policies:
        return False

    # Build evaluation context
    context = build_context(user, resource, workspace_slug)

    # Evaluate policies
    engine = get_engine()
    return engine.evaluate(policies, action, context)


def can_access_project(user: "User", project: Any) -> bool:
    """
    Check if a user can access (read) a project.

    Shortcut for common permission check.

    Args:
        user: The user
        project: The project to check access for

    Returns:
        True if user can access the project
    """
    return can(user, "project:read", project)


def can_access_resource(user: "User", action: str, resource: Any) -> bool:
    """
    Alias for can() for semantic clarity.

    Args:
        user: The user
        action: The action to check
        resource: The resource

    Returns:
        True if action is allowed
    """
    return can(user, action, resource)


def _extract_workspace_slug(resource: Any) -> Optional[str]:
    """
    Extract workspace slug from a resource.

    Args:
        resource: Any resource that might have workspace info

    Returns:
        Workspace slug or None
    """
    # Direct workspace attribute
    if hasattr(resource, "workspace"):
        workspace = resource.workspace
        if workspace and hasattr(workspace, "slug"):
            return workspace.slug

    # Through project
    if hasattr(resource, "project") and resource.project:
        project = resource.project
        if hasattr(project, "workspace") and project.workspace:
            return project.workspace.slug

    # Resource IS a workspace
    if hasattr(resource, "slug") and type(resource).__name__ == "Workspace":
        return resource.slug

    return None


def is_workspace_owner(user: "User", workspace_slug: str) -> bool:
    """
    Check if a user is the owner (root account) of a workspace.

    The workspace owner always has full access to everything,
    bypassing all IAM policy checks.

    Args:
        user: The user to check
        workspace_slug: The workspace slug

    Returns:
        True if user is the workspace owner
    """
    # Cache key for owner check
    cache_key = f"workspace_owner:{workspace_slug}:{user.id}"
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    from plane.db.models import Workspace

    try:
        workspace = Workspace.objects.only("owner_id").get(slug=workspace_slug)
        is_owner = workspace.owner_id == user.id
    except Workspace.DoesNotExist:
        is_owner = False

    # Cache for 5 minutes
    cache.set(cache_key, is_owner, 300)
    return is_owner


# Re-export types for convenience
from .types import EvaluationContext, PolicyDocument, Statement, Effect

__all__ = [
    "can",
    "can_access_project",
    "can_access_resource",
    "is_workspace_owner",
    "EvaluationContext",
    "PolicyDocument",
    "Statement",
    "Effect",
]
