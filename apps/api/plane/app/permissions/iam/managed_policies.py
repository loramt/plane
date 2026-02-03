"""
Managed IAM Policies

Hardcoded policies that are always available in every workspace.
"""
from plane.db.models import Policy


# Administrator policy document - full access to everything
ADMINISTRATOR_POLICY_DOCUMENT = {
    "statements": [
        {
            "sid": "AdministratorAccess",
            "effect": "allow",
            "actions": ["*"],
            "resources": ["*"],
        }
    ]
}

MANAGED_POLICIES = {
    "Administrator": {
        "name": "Administrator",
        "description": "Full access to all workspace resources. This policy grants unrestricted permissions.",
        "document": ADMINISTRATOR_POLICY_DOCUMENT,
    },
}


def ensure_administrator_policy(workspace):
    """
    Ensures the Administrator policy exists for a workspace.
    Creates it if it doesn't exist, returns existing one if it does.

    Returns the Administrator policy instance.
    """
    policy, created = Policy.objects.get_or_create(
        name="Administrator",
        workspace=workspace,
        deleted_at__isnull=True,
        defaults={
            "description": MANAGED_POLICIES["Administrator"]["description"],
            "document": MANAGED_POLICIES["Administrator"]["document"],
            "is_managed": True,
        }
    )

    # If policy exists but document is outdated, update it
    if not created and policy.document != ADMINISTRATOR_POLICY_DOCUMENT:
        policy.document = ADMINISTRATOR_POLICY_DOCUMENT
        policy.is_managed = True
        policy.save(update_fields=["document", "is_managed"])

    return policy


def get_managed_policy_ids(workspace):
    """
    Returns a dict mapping managed policy names to their IDs for a workspace.
    Ensures all managed policies exist.
    """
    result = {}

    for name in MANAGED_POLICIES.keys():
        if name == "Administrator":
            policy = ensure_administrator_policy(workspace)
            result[name] = str(policy.id)

    return result


def is_administrator_policy(policy_id, workspace):
    """
    Checks if a policy ID is the Administrator policy for a workspace.
    """
    try:
        policy = Policy.objects.get(
            id=policy_id,
            workspace=workspace,
            deleted_at__isnull=True
        )
        return policy.name == "Administrator" and policy.is_managed
    except Policy.DoesNotExist:
        return False
