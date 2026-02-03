"""
IAM Permission Decorator.

Replaces the old @allow_permission decorator with IAM-based permission checks.
"""
from functools import wraps
from typing import Optional, Callable, Any

from rest_framework.response import Response
from rest_framework import status

from .service import can


def iam_permission(action: str, resource_loader: Optional[Callable] = None):
    """
    Decorator for IAM permission checks on view methods.

    Automatically extracts:
    - User from request.user
    - Resource from ViewSet model + pk, or custom resource_loader
    - Workspace from slug in kwargs

    Args:
        action: The IAM action to check (e.g., "issue:delete", "project:read")
        resource_loader: Optional function to load resource.
                        Signature: (view_instance, request, *args, **kwargs) -> resource
                        If not provided, tries to load from self.model using pk

    Usage:
        @iam_permission(action="issue:delete")
        def destroy(self, request, slug, project_id, pk):
            ...

        # With custom resource loader
        @iam_permission(
            action="project:update",
            resource_loader=lambda self, req, *a, **kw: Project.objects.get(pk=kw['pk'])
        )
        def update(self, request, slug, pk):
            ...

        # For create endpoints (no resource yet, checks workspace-level)
        @iam_permission(action="issue:create")
        def create(self, request, slug, project_id):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(self, request, *args, **kwargs):
            # 1. Get user from request
            user = request.user
            if not user or not user.is_authenticated:
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # 2. Get workspace slug
            workspace_slug = kwargs.get("slug")

            # 3. Get resource
            resource = None

            if resource_loader:
                # Use custom resource loader
                try:
                    resource = resource_loader(self, request, *args, **kwargs)
                except Exception:
                    # Resource not found or loader failed
                    pass
            else:
                # Try to auto-load resource
                resource = _auto_load_resource(self, kwargs)

            # 4. Check IAM permission
            if not can(user, action, resource, workspace_slug):
                return Response(
                    {"error": "You don't have permission to perform this action"},
                    status=status.HTTP_403_FORBIDDEN
                )

            return view_func(self, request, *args, **kwargs)

        return _wrapped_view
    return decorator


def _auto_load_resource(view_instance, kwargs: dict) -> Any:
    """
    Automatically load resource based on ViewSet model and kwargs.

    Priority:
    1. pk in kwargs + self.model
    2. project_id in kwargs -> load Project
    3. Return a dict with available context (for create operations)
    """
    pk = kwargs.get("pk")
    project_id = kwargs.get("project_id")
    slug = kwargs.get("slug")

    # Try to load from ViewSet's model
    if pk and hasattr(view_instance, "model") and view_instance.model:
        try:
            return view_instance.model.objects.get(pk=pk, deleted_at__isnull=True)
        except Exception:
            pass

    # Try to load project if project_id is provided
    if project_id:
        try:
            from plane.db.models import Project
            return Project.objects.get(pk=project_id, deleted_at__isnull=True)
        except Exception:
            pass

    # For create operations or when no specific resource exists,
    # return a context dict that can be used for workspace-level checks
    if slug:
        try:
            from plane.db.models import Workspace
            workspace = Workspace.objects.get(slug=slug, deleted_at__isnull=True)
            # Return a pseudo-resource with workspace info
            return _WorkspaceContext(workspace, project_id)
        except Exception:
            pass

    return None


class _WorkspaceContext:
    """
    Pseudo-resource for workspace-level permission checks.
    Used when no specific resource exists (e.g., create operations).
    """
    def __init__(self, workspace, project_id=None):
        self.workspace = workspace
        self.workspace_id = workspace.id
        self.project_id = project_id
        self.project = None
        if project_id:
            try:
                from plane.db.models import Project
                self.project = Project.objects.get(pk=project_id, deleted_at__isnull=True)
            except Exception:
                pass


# Convenience decorators for common actions
def can_read(resource_type: str, resource_loader: Optional[Callable] = None):
    """Decorator for read permission."""
    return iam_permission(f"{resource_type}:read", resource_loader)


def can_create(resource_type: str, resource_loader: Optional[Callable] = None):
    """Decorator for create permission."""
    return iam_permission(f"{resource_type}:create", resource_loader)


def can_update(resource_type: str, resource_loader: Optional[Callable] = None):
    """Decorator for update permission."""
    return iam_permission(f"{resource_type}:update", resource_loader)


def can_delete(resource_type: str, resource_loader: Optional[Callable] = None):
    """Decorator for delete permission."""
    return iam_permission(f"{resource_type}:delete", resource_loader)
