"""
URL patterns for IAM endpoints.

Routes:
- /workspaces/<slug>/groups/                          - IAM Groups
- /workspaces/<slug>/groups/<id>/                     - IAM Group detail
- /workspaces/<slug>/groups/<id>/members/             - Group members
- /workspaces/<slug>/groups/<id>/members/<id>/        - Group member detail
- /workspaces/<slug>/groups/<id>/policies/            - Group policies
- /workspaces/<slug>/groups/<id>/policies/<id>/       - Group policy detail
- /workspaces/<slug>/policies/                        - IAM Policies
- /workspaces/<slug>/policies/<id>/                   - IAM Policy detail
- /workspaces/<slug>/user-policies/                   - User policies
- /workspaces/<slug>/user-policies/<id>/              - User policy detail
- /workspaces/<slug>/my-policies/                     - Current user's policies
- /workspaces/<slug>/project-groups/                  - Project Groups
- /workspaces/<slug>/project-groups/<id>/             - Project Group detail
"""

from django.urls import path

from plane.app.views.iam import (
    GroupViewSet,
    GroupMemberViewSet,
    PolicyViewSet,
    GroupPolicyViewSet,
    UserPolicyViewSet,
    MyPoliciesEndpoint,
    ProjectGroupViewSet,
    PoliciesForInvitationEndpoint,
    MemberPoliciesEndpoint,
)


urlpatterns = [
    # IAM Groups
    path(
        "workspaces/<str:slug>/groups/",
        GroupViewSet.as_view({"get": "list", "post": "create"}),
        name="iam-groups",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:pk>/",
        GroupViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy"
        }),
        name="iam-group-detail",
    ),

    # Group Members
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/",
        GroupMemberViewSet.as_view({"get": "list", "post": "create"}),
        name="iam-group-members",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/<uuid:pk>/",
        GroupMemberViewSet.as_view({"delete": "destroy"}),
        name="iam-group-member-detail",
    ),

    # Group Policies
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/policies/",
        GroupPolicyViewSet.as_view({"get": "list", "post": "create"}),
        name="iam-group-policies",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/policies/<uuid:pk>/",
        GroupPolicyViewSet.as_view({"delete": "destroy"}),
        name="iam-group-policy-detail",
    ),

    # IAM Policies
    path(
        "workspaces/<str:slug>/policies/",
        PolicyViewSet.as_view({"get": "list", "post": "create"}),
        name="iam-policies",
    ),
    path(
        "workspaces/<str:slug>/policies/<uuid:pk>/",
        PolicyViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy"
        }),
        name="iam-policy-detail",
    ),

    # User Policies (direct policy attachment to users)
    path(
        "workspaces/<str:slug>/user-policies/",
        UserPolicyViewSet.as_view({"get": "list", "post": "create"}),
        name="iam-user-policies",
    ),
    path(
        "workspaces/<str:slug>/user-policies/<uuid:pk>/",
        UserPolicyViewSet.as_view({"delete": "destroy"}),
        name="iam-user-policy-detail",
    ),

    # My Policies (current user's aggregated policies)
    path(
        "workspaces/<str:slug>/my-policies/",
        MyPoliciesEndpoint.as_view(),
        name="iam-my-policies",
    ),

    # Project Groups (visual grouping)
    path(
        "workspaces/<str:slug>/project-groups/",
        ProjectGroupViewSet.as_view({"get": "list", "post": "create"}),
        name="project-groups",
    ),
    path(
        "workspaces/<str:slug>/project-groups/<uuid:pk>/",
        ProjectGroupViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy"
        }),
        name="project-group-detail",
    ),

    # Policies for Invitation (used when inviting new users)
    path(
        "workspaces/<str:slug>/policies-for-invitation/",
        PoliciesForInvitationEndpoint.as_view(),
        name="policies-for-invitation",
    ),

    # Member Policies (get/update policies for a specific member)
    path(
        "workspaces/<str:slug>/members/<uuid:member_id>/policies/",
        MemberPoliciesEndpoint.as_view(),
        name="member-policies",
    ),
]
