"""
IAM Serializers for Groups, Policies, and ProjectGroups.
"""
from rest_framework import serializers

from plane.db.models import (
    Group,
    GroupMember,
    Policy,
    GroupPolicy,
    UserPolicy,
    ProjectGroup,
    User,
)
from .base import BaseSerializer


class GroupSerializer(BaseSerializer):
    """Serializer for IAM Groups."""
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "workspace",
            "member_count",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["workspace", "created_at", "updated_at", "created_by"]


class GroupLiteSerializer(BaseSerializer):
    """Lite serializer for IAM Groups."""

    class Meta:
        model = Group
        fields = ["id", "name", "description"]
        read_only_fields = fields


class GroupMemberSerializer(BaseSerializer):
    """Serializer for Group membership."""
    member_detail = serializers.SerializerMethodField()

    class Meta:
        model = GroupMember
        fields = [
            "id",
            "group",
            "member",
            "member_detail",
            "workspace",
            "created_at",
        ]
        read_only_fields = ["workspace", "created_at"]

    def get_member_detail(self, obj):
        from .user import UserLiteSerializer
        return UserLiteSerializer(obj.member).data


class PolicyDocumentSerializer(serializers.Serializer):
    """Serializer for policy document validation."""
    version = serializers.CharField(default="2024-01-01")
    statements = serializers.ListField(child=serializers.DictField())

    def validate_statements(self, statements):
        """Validate policy statements structure."""
        for i, statement in enumerate(statements):
            # Check required fields
            if "effect" not in statement:
                raise serializers.ValidationError(
                    f"Statement {i}: 'effect' is required"
                )
            if statement["effect"] not in ["allow", "deny"]:
                raise serializers.ValidationError(
                    f"Statement {i}: 'effect' must be 'allow' or 'deny'"
                )
            if "actions" not in statement:
                raise serializers.ValidationError(
                    f"Statement {i}: 'actions' is required"
                )
            if not isinstance(statement["actions"], list):
                raise serializers.ValidationError(
                    f"Statement {i}: 'actions' must be a list"
                )

            # Validate resources if present
            if "resources" in statement and not isinstance(statement["resources"], list):
                raise serializers.ValidationError(
                    f"Statement {i}: 'resources' must be a list"
                )

            # Validate conditions if present
            if "conditions" in statement and not isinstance(statement["conditions"], dict):
                raise serializers.ValidationError(
                    f"Statement {i}: 'conditions' must be an object"
                )

        return statements


class PolicySerializer(BaseSerializer):
    """Serializer for IAM Policies."""
    document = PolicyDocumentSerializer()

    class Meta:
        model = Policy
        fields = [
            "id",
            "name",
            "description",
            "workspace",
            "document",
            "is_managed",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["workspace", "is_managed", "created_at", "updated_at", "created_by"]

    def create(self, validated_data):
        """Create a new policy."""
        workspace_id = self.context.get("workspace_id")
        validated_data["workspace_id"] = workspace_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update an existing policy."""
        # Don't allow updating managed policies
        if instance.is_managed:
            raise serializers.ValidationError("Cannot modify managed policies")
        return super().update(instance, validated_data)


class PolicyLiteSerializer(BaseSerializer):
    """Lite serializer for IAM Policies."""

    class Meta:
        model = Policy
        fields = ["id", "name", "description", "is_managed"]
        read_only_fields = fields


class GroupPolicySerializer(BaseSerializer):
    """Serializer for attaching policies to groups."""
    policy_detail = PolicyLiteSerializer(source="policy", read_only=True)
    group_detail = GroupLiteSerializer(source="group", read_only=True)

    class Meta:
        model = GroupPolicy
        fields = [
            "id",
            "group",
            "policy",
            "group_detail",
            "policy_detail",
            "workspace",
            "created_at",
        ]
        read_only_fields = ["workspace", "created_at"]


class UserPolicySerializer(BaseSerializer):
    """Serializer for attaching policies to users."""
    policy_detail = PolicyLiteSerializer(source="policy", read_only=True)

    class Meta:
        model = UserPolicy
        fields = [
            "id",
            "user",
            "policy",
            "policy_detail",
            "workspace",
            "created_at",
        ]
        read_only_fields = ["workspace", "created_at"]


class ProjectGroupSerializer(BaseSerializer):
    """Serializer for Project Groups (visual grouping)."""
    project_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProjectGroup
        fields = [
            "id",
            "name",
            "description",
            "workspace",
            "color",
            "icon",
            "sort_order",
            "project_count",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["workspace", "created_at", "updated_at", "created_by"]


class ProjectGroupLiteSerializer(BaseSerializer):
    """Lite serializer for Project Groups."""

    class Meta:
        model = ProjectGroup
        fields = ["id", "name", "color", "icon"]
        read_only_fields = fields


class MyPoliciesSerializer(serializers.Serializer):
    """
    Serializer for the my-policies endpoint.
    Returns all policies applicable to the current user.
    """
    policies = PolicySerializer(many=True)
    groups = GroupLiteSerializer(many=True)
    actor = serializers.SerializerMethodField()

    def get_actor(self, obj):
        user = obj.get("user")
        return {
            "id": str(user.id),
            "email": user.email,
            "groups": [g.name for g in obj.get("groups", [])],
        }
