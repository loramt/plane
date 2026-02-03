from .workspace import (
    WorkSpaceBasePermission,
    WorkspaceOwnerPermission,
    WorkSpaceAdminPermission,
    WorkspaceEntityPermission,
    WorkspaceViewerPermission,
    WorkspaceUserPermission,
)
from .project import (
    ProjectBasePermission,
    ProjectEntityPermission,
    ProjectMemberPermission,
    ProjectLitePermission,
    ProjectAdminPermission,
)
from .base import allow_permission, ROLE
from .page import ProjectPagePermission

# IAM Permission System
from .iam import (
    can,
    can_access_project,
    can_access_resource,
    iam_permission,
    can_read,
    can_create,
    can_update,
    can_delete,
)
