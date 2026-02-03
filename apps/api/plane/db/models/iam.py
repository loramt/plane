# Python imports
from typing import Optional, Any

# Django imports
from django.conf import settings
from django.db import models
from django.db.models import Q

# Module imports
from .base import BaseModel


def get_default_policy_document():
    """Default empty policy document."""
    return {
        "version": "2024-01-01",
        "statements": []
    }


class Group(BaseModel):
    """
    IAM Group - groups users together for policy assignment.
    Similar to AWS IAM Groups.
    """
    name = models.CharField(max_length=255, verbose_name="Group Name")
    description = models.TextField(verbose_name="Group Description", blank=True, null=True)
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="iam_groups"
    )

    class Meta:
        unique_together = ["name", "workspace", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "workspace"],
                condition=Q(deleted_at__isnull=True),
                name="iam_group_unique_name_workspace_when_deleted_at_null",
            )
        ]
        verbose_name = "IAM Group"
        verbose_name_plural = "IAM Groups"
        db_table = "iam_groups"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} <{self.workspace.name}>"


class GroupMember(BaseModel):
    """
    Relationship between User and Group.
    """
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="members"
    )
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="iam_group_memberships"
    )
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="iam_group_members"
    )

    class Meta:
        unique_together = ["group", "member", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "member"],
                condition=Q(deleted_at__isnull=True),
                name="iam_group_member_unique_group_member_when_deleted_at_null",
            )
        ]
        verbose_name = "IAM Group Member"
        verbose_name_plural = "IAM Group Members"
        db_table = "iam_group_members"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.member.email} in {self.group.name}"

    def save(self, *args, **kwargs):
        # Auto-sync workspace from group
        self.workspace = self.group.workspace
        super().save(*args, **kwargs)


class Policy(BaseModel):
    """
    IAM Policy - contains JSON policy document with statements.
    Similar to AWS IAM Policies.
    """
    name = models.CharField(max_length=255, verbose_name="Policy Name")
    description = models.TextField(verbose_name="Policy Description", blank=True, null=True)
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="iam_policies"
    )
    document = models.JSONField(
        default=get_default_policy_document,
        verbose_name="Policy Document",
        help_text="JSON policy document with version and statements"
    )
    # Whether this is a managed (built-in) policy or customer-created
    is_managed = models.BooleanField(default=False)

    class Meta:
        unique_together = ["name", "workspace", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "workspace"],
                condition=Q(deleted_at__isnull=True),
                name="iam_policy_unique_name_workspace_when_deleted_at_null",
            )
        ]
        verbose_name = "IAM Policy"
        verbose_name_plural = "IAM Policies"
        db_table = "iam_policies"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} <{self.workspace.name}>"


class GroupPolicy(BaseModel):
    """
    Attaches a Policy to a Group.
    All members of the group inherit this policy.
    """
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="policies"
    )
    policy = models.ForeignKey(
        Policy,
        on_delete=models.CASCADE,
        related_name="group_attachments"
    )
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="iam_group_policies"
    )

    class Meta:
        unique_together = ["group", "policy", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "policy"],
                condition=Q(deleted_at__isnull=True),
                name="iam_group_policy_unique_group_policy_when_deleted_at_null",
            )
        ]
        verbose_name = "IAM Group Policy"
        verbose_name_plural = "IAM Group Policies"
        db_table = "iam_group_policies"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.policy.name} -> {self.group.name}"

    def save(self, *args, **kwargs):
        # Auto-sync workspace from group
        self.workspace = self.group.workspace
        super().save(*args, **kwargs)


class UserPolicy(BaseModel):
    """
    Attaches a Policy directly to a User (inline policy).
    For user-specific permissions that don't fit into groups.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="iam_user_policies"
    )
    policy = models.ForeignKey(
        Policy,
        on_delete=models.CASCADE,
        related_name="user_attachments"
    )
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="iam_user_policies"
    )

    class Meta:
        unique_together = ["user", "policy", "workspace", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "policy", "workspace"],
                condition=Q(deleted_at__isnull=True),
                name="iam_user_policy_unique_user_policy_workspace_when_deleted_at_null",
            )
        ]
        verbose_name = "IAM User Policy"
        verbose_name_plural = "IAM User Policies"
        db_table = "iam_user_policies"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.policy.name} -> {self.user.email}"


class ProjectGroup(BaseModel):
    """
    Visual grouping of projects in the sidebar.
    Projects can belong to one ProjectGroup for organization purposes.
    This is purely for UI organization, not permissions.
    """
    name = models.CharField(max_length=255, verbose_name="Project Group Name")
    description = models.TextField(verbose_name="Project Group Description", blank=True, null=True)
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="project_groups"
    )
    # Optional color/icon for visual distinction
    color = models.CharField(max_length=50, blank=True, null=True)
    icon = models.CharField(max_length=255, blank=True, null=True)
    # Sort order for displaying groups
    sort_order = models.FloatField(default=65535)

    class Meta:
        unique_together = ["name", "workspace", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "workspace"],
                condition=Q(deleted_at__isnull=True),
                name="project_group_unique_name_workspace_when_deleted_at_null",
            )
        ]
        verbose_name = "Project Group"
        verbose_name_plural = "Project Groups"
        db_table = "project_groups"
        ordering = ("sort_order", "-created_at")

    def __str__(self):
        return f"{self.name} <{self.workspace.name}>"

    def save(self, *args, **kwargs):
        if self._state.adding:
            # Get the minimum sort_order for this workspace
            from django.db.models import Min
            min_sort_order_result = ProjectGroup.objects.filter(
                workspace=self.workspace
            ).aggregate(min_sort_order=Min("sort_order"))
            min_sort_order = min_sort_order_result.get("min_sort_order")

            if min_sort_order is not None:
                self.sort_order = min_sort_order - 10000
        super().save(*args, **kwargs)
