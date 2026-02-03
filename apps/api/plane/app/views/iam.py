"""
IAM Views for Groups, Policies, and ProjectGroups.
"""
from django.db.models import Count, Q

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, iam_permission
from plane.app.serializers import (
    GroupSerializer,
    GroupMemberSerializer,
    PolicySerializer,
    GroupPolicySerializer,
    UserPolicySerializer,
    ProjectGroupSerializer,
    MyPoliciesSerializer,
)
from plane.db.models import (
    Group,
    GroupMember,
    Policy,
    GroupPolicy,
    UserPolicy,
    ProjectGroup,
    Workspace,
)
from plane.app.permissions.iam.context import invalidate_user_policies_cache

from .base import BaseViewSet, BaseAPIView


# ============================================================================
# Group Views
# ============================================================================

class GroupViewSet(BaseViewSet):
    """
    ViewSet for managing IAM Groups.
    Groups are used to organize users and attach policies.
    """
    model = Group
    serializer_class = GroupSerializer

    def get_queryset(self):
        return (
            Group.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .annotate(
                member_count=Count(
                    "members",
                    filter=Q(members__deleted_at__isnull=True)
                )
            )
            .select_related("workspace", "created_by")
            .order_by("-created_at")
        )

    @iam_permission(action="group:create")
    def create(self, request, slug):
        """Create a new IAM group."""
        workspace = Workspace.objects.get(slug=slug, deleted_at__isnull=True)

        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="group:read")
    def list(self, request, slug):
        """List all IAM groups in the workspace."""
        groups = self.get_queryset()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="group:read")
    def retrieve(self, request, slug, pk):
        """Retrieve a single IAM group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Group not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="group:update")
    def partial_update(self, request, slug, pk):
        """Update an IAM group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="group:delete")
    def destroy(self, request, slug, pk):
        """Delete an IAM group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Group Member Views
# ============================================================================

class GroupMemberViewSet(BaseViewSet):
    """
    ViewSet for managing Group Members.
    """
    model = GroupMember
    serializer_class = GroupMemberSerializer

    def get_queryset(self):
        return (
            GroupMember.objects.filter(
                group_id=self.kwargs.get("group_id"),
                group__workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .select_related("member", "group")
            .order_by("-created_at")
        )

    @iam_permission(action="group:update")
    def create(self, request, slug, group_id):
        """Add a member to a group."""
        group = Group.objects.filter(
            id=group_id,
            workspace__slug=slug,
            deleted_at__isnull=True
        ).first()

        if not group:
            return Response(
                {"error": "Group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GroupMemberSerializer(data=request.data)
        if serializer.is_valid():
            member = serializer.save(group=group)
            # Invalidate policy cache for the user
            invalidate_user_policies_cache(str(member.member_id), slug)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="group:read")
    def list(self, request, slug, group_id):
        """List all members of a group."""
        members = self.get_queryset()
        serializer = GroupMemberSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="group:update")
    def destroy(self, request, slug, group_id, pk):
        """Remove a member from a group."""
        member = self.get_queryset().filter(pk=pk).first()
        if not member:
            return Response(
                {"error": "Group member not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = str(member.member_id)
        member.delete()
        # Invalidate policy cache for the user
        invalidate_user_policies_cache(user_id, slug)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Policy Views
# ============================================================================

class PolicyViewSet(BaseViewSet):
    """
    ViewSet for managing IAM Policies.
    """
    model = Policy
    serializer_class = PolicySerializer

    def get_queryset(self):
        return (
            Policy.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .select_related("workspace", "created_by")
            .order_by("-created_at")
        )

    @iam_permission(action="policy:create")
    def create(self, request, slug):
        """Create a new IAM policy."""
        workspace = Workspace.objects.get(slug=slug, deleted_at__isnull=True)

        serializer = PolicySerializer(
            data=request.data,
            context={"workspace_id": workspace.id}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="policy:read")
    def list(self, request, slug):
        """List all IAM policies in the workspace."""
        policies = self.get_queryset()
        serializer = PolicySerializer(policies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="policy:read")
    def retrieve(self, request, slug, pk):
        """Retrieve a single IAM policy."""
        policy = self.get_queryset().filter(pk=pk).first()
        if not policy:
            return Response(
                {"error": "Policy not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = PolicySerializer(policy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="policy:update")
    def partial_update(self, request, slug, pk):
        """Update an IAM policy."""
        policy = self.get_queryset().filter(pk=pk).first()
        if not policy:
            return Response(
                {"error": "Policy not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if policy.is_managed:
            return Response(
                {"error": "Cannot modify managed policies"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="policy:delete")
    def destroy(self, request, slug, pk):
        """Delete an IAM policy."""
        policy = self.get_queryset().filter(pk=pk).first()
        if not policy:
            return Response(
                {"error": "Policy not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if policy.is_managed:
            return Response(
                {"error": "Cannot delete managed policies"},
                status=status.HTTP_403_FORBIDDEN
            )

        policy.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Group Policy Views
# ============================================================================

class GroupPolicyViewSet(BaseViewSet):
    """
    ViewSet for attaching/detaching policies to/from groups.
    """
    model = GroupPolicy
    serializer_class = GroupPolicySerializer

    def get_queryset(self):
        return (
            GroupPolicy.objects.filter(
                group_id=self.kwargs.get("group_id"),
                group__workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .select_related("group", "policy")
            .order_by("-created_at")
        )

    @iam_permission(action="group:update")
    def create(self, request, slug, group_id):
        """Attach a policy to a group."""
        group = Group.objects.filter(
            id=group_id,
            workspace__slug=slug,
            deleted_at__isnull=True
        ).first()

        if not group:
            return Response(
                {"error": "Group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = GroupPolicySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(group=group)
            # Invalidate cache for all group members
            for member in group.members.filter(deleted_at__isnull=True):
                invalidate_user_policies_cache(str(member.member_id), slug)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="group:read")
    def list(self, request, slug, group_id):
        """List all policies attached to a group."""
        policies = self.get_queryset()
        serializer = GroupPolicySerializer(policies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="group:update")
    def destroy(self, request, slug, group_id, pk):
        """Detach a policy from a group."""
        group_policy = self.get_queryset().filter(pk=pk).first()
        if not group_policy:
            return Response(
                {"error": "Group policy not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        group = group_policy.group
        group_policy.delete()
        # Invalidate cache for all group members
        for member in group.members.filter(deleted_at__isnull=True):
            invalidate_user_policies_cache(str(member.member_id), slug)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# User Policy Views
# ============================================================================

class UserPolicyViewSet(BaseViewSet):
    """
    ViewSet for attaching/detaching policies directly to/from users.
    """
    model = UserPolicy
    serializer_class = UserPolicySerializer

    def get_queryset(self):
        return (
            UserPolicy.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .select_related("user", "policy")
            .order_by("-created_at")
        )

    @iam_permission(action="policy:create")
    def create(self, request, slug):
        """Attach a policy to a user."""
        workspace = Workspace.objects.get(slug=slug, deleted_at__isnull=True)

        serializer = UserPolicySerializer(data=request.data)
        if serializer.is_valid():
            user_policy = serializer.save(workspace=workspace)
            # Invalidate cache for the user
            invalidate_user_policies_cache(str(user_policy.user_id), slug)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="policy:read")
    def list(self, request, slug):
        """List all user policies in the workspace."""
        policies = self.get_queryset()
        serializer = UserPolicySerializer(policies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="policy:delete")
    def destroy(self, request, slug, pk):
        """Detach a policy from a user."""
        user_policy = self.get_queryset().filter(pk=pk).first()
        if not user_policy:
            return Response(
                {"error": "User policy not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = str(user_policy.user_id)
        user_policy.delete()
        # Invalidate cache for the user
        invalidate_user_policies_cache(user_id, slug)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# My Policies Endpoint
# ============================================================================

class MyPoliciesEndpoint(BaseAPIView):
    """
    Returns all policies applicable to the current user.
    This is the main endpoint for frontend to fetch policies.
    """

    @iam_permission(action="policy:read")
    def get(self, request, slug):
        """Get all policies for the current user in this workspace."""
        workspace = Workspace.objects.filter(
            slug=slug,
            deleted_at__isnull=True
        ).first()

        if not workspace:
            return Response(
                {"error": "Workspace not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # Get user's groups
        user_groups = Group.objects.filter(
            members__member=user,
            members__deleted_at__isnull=True,
            workspace=workspace,
            deleted_at__isnull=True,
        )

        # Get policies from groups
        group_policy_ids = GroupPolicy.objects.filter(
            group__in=user_groups,
            deleted_at__isnull=True,
        ).values_list("policy_id", flat=True)

        # Get direct user policies
        user_policy_ids = UserPolicy.objects.filter(
            user=user,
            workspace=workspace,
            deleted_at__isnull=True,
        ).values_list("policy_id", flat=True)

        # Combine and fetch policies
        all_policy_ids = set(group_policy_ids) | set(user_policy_ids)
        policies = Policy.objects.filter(
            id__in=all_policy_ids,
            deleted_at__isnull=True,
        )

        # Serialize response
        from plane.app.serializers.iam import (
            PolicySerializer,
            GroupLiteSerializer,
        )

        response_data = {
            "policies": PolicySerializer(policies, many=True).data,
            "groups": GroupLiteSerializer(user_groups, many=True).data,
            "actor": {
                "id": str(user.id),
                "email": user.email,
                "groups": list(user_groups.values_list("name", flat=True)),
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


# ============================================================================
# Project Group Views
# ============================================================================

class ProjectGroupViewSet(BaseViewSet):
    """
    ViewSet for managing Project Groups (visual grouping in sidebar).
    """
    model = ProjectGroup
    serializer_class = ProjectGroupSerializer

    def get_queryset(self):
        return (
            ProjectGroup.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .annotate(
                project_count=Count(
                    "projects",
                    filter=Q(projects__deleted_at__isnull=True)
                )
            )
            .select_related("workspace", "created_by")
            .order_by("sort_order", "-created_at")
        )

    @iam_permission(action="project_group:create")
    def create(self, request, slug):
        """Create a new project group."""
        workspace = Workspace.objects.get(slug=slug, deleted_at__isnull=True)

        serializer = ProjectGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="project_group:read")
    def list(self, request, slug):
        """List all project groups in the workspace."""
        groups = self.get_queryset()
        serializer = ProjectGroupSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="project_group:read")
    def retrieve(self, request, slug, pk):
        """Retrieve a single project group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Project group not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProjectGroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @iam_permission(action="project_group:update")
    def partial_update(self, request, slug, pk):
        """Update a project group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Project group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectGroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @iam_permission(action="project_group:delete")
    def destroy(self, request, slug, pk):
        """Delete a project group."""
        group = self.get_queryset().filter(pk=pk).first()
        if not group:
            return Response(
                {"error": "Project group not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Remove project_group from all projects in this group
        group.projects.update(project_group=None)

        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
