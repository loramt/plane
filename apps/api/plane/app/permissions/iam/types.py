"""
Type definitions for IAM Policy Engine.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
from enum import Enum


class Effect(Enum):
    """Policy statement effect."""
    ALLOW = "allow"
    DENY = "deny"


@dataclass
class Statement:
    """
    A single policy statement.

    Example:
    {
        "sid": "AllowProjectRead",
        "effect": "allow",
        "actions": ["project:read", "issue:read"],
        "resources": ["*"],
        "conditions": {
            "StringEquals": {
                "resource.group.name": "Engineering"
            }
        }
    }
    """
    effect: Effect
    actions: List[str]
    resources: List[str] = field(default_factory=lambda: ["*"])
    conditions: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    sid: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Statement":
        """Create Statement from dictionary."""
        return cls(
            sid=data.get("sid"),
            effect=Effect(data.get("effect", "deny")),
            actions=data.get("actions", []),
            resources=data.get("resources", ["*"]),
            conditions=data.get("conditions", {})
        )


@dataclass
class PolicyDocument:
    """
    A complete policy document.

    Example:
    {
        "version": "2024-01-01",
        "statements": [...]
    }
    """
    version: str
    statements: List[Statement]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PolicyDocument":
        """Create PolicyDocument from dictionary."""
        return cls(
            version=data.get("version", "2024-01-01"),
            statements=[
                Statement.from_dict(s) for s in data.get("statements", [])
            ]
        )


@dataclass
class EvaluationContext:
    """
    Context for policy evaluation.
    Contains all information about the actor, resource, and environment.
    """
    # Actor information
    actor_id: str
    actor_email: str
    actor_groups: List[str] = field(default_factory=list)

    # Resource information
    workspace_id: Optional[str] = None
    workspace_slug: Optional[str] = None
    project_id: Optional[str] = None
    project_group_id: Optional[str] = None
    project_group_name: Optional[str] = None
    resource_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_created_by: Optional[str] = None

    # Additional resource attributes
    resource_attributes: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for condition evaluation."""
        return {
            "actor": {
                "id": self.actor_id,
                "email": self.actor_email,
                "groups": self.actor_groups,
            },
            "resource": {
                "workspace_id": self.workspace_id,
                "workspace_slug": self.workspace_slug,
                "project_id": self.project_id,
                "group": {
                    "id": self.project_group_id,
                    "name": self.project_group_name,
                },
                "id": self.resource_id,
                "type": self.resource_type,
                "created_by": self.resource_created_by,
                **self.resource_attributes,
            },
        }
