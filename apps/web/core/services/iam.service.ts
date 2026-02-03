/**
 * IAM Service
 *
 * API service for IAM endpoints (Groups, Policies, ProjectGroups).
 * Only handles API calls - no business logic.
 */
import { API_BASE_URL } from "@plane/constants";
import type {
  IGroup,
  IGroupMember,
  IPolicy,
  IProjectGroup,
  IMyPoliciesResponse,
} from "@plane/permissions";
import { APIService } from "@/services/api.service";

export class IAMService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  // ============================================================================
  // My Policies (main endpoint for frontend)
  // ============================================================================

  async fetchMyPolicies(workspaceSlug: string): Promise<IMyPoliciesResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/my-policies/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // Groups
  // ============================================================================

  async fetchGroups(workspaceSlug: string): Promise<IGroup[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/groups/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchGroup(workspaceSlug: string, groupId: string): Promise<IGroup> {
    return this.get(`/api/workspaces/${workspaceSlug}/groups/${groupId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createGroup(
    workspaceSlug: string,
    data: Partial<IGroup>
  ): Promise<IGroup> {
    return this.post(`/api/workspaces/${workspaceSlug}/groups/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateGroup(
    workspaceSlug: string,
    groupId: string,
    data: Partial<IGroup>
  ): Promise<IGroup> {
    return this.patch(`/api/workspaces/${workspaceSlug}/groups/${groupId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteGroup(workspaceSlug: string, groupId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/groups/${groupId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // Group Members
  // ============================================================================

  async fetchGroupMembers(
    workspaceSlug: string,
    groupId: string
  ): Promise<IGroupMember[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/groups/${groupId}/members/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addGroupMember(
    workspaceSlug: string,
    groupId: string,
    memberId: string
  ): Promise<IGroupMember> {
    return this.post(`/api/workspaces/${workspaceSlug}/groups/${groupId}/members/`, {
      member: memberId,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeGroupMember(
    workspaceSlug: string,
    groupId: string,
    membershipId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/groups/${groupId}/members/${membershipId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // Policies
  // ============================================================================

  async fetchPolicies(workspaceSlug: string): Promise<IPolicy[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/policies/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchPolicy(workspaceSlug: string, policyId: string): Promise<IPolicy> {
    return this.get(`/api/workspaces/${workspaceSlug}/policies/${policyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createPolicy(
    workspaceSlug: string,
    data: Partial<IPolicy>
  ): Promise<IPolicy> {
    return this.post(`/api/workspaces/${workspaceSlug}/policies/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updatePolicy(
    workspaceSlug: string,
    policyId: string,
    data: Partial<IPolicy>
  ): Promise<IPolicy> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/policies/${policyId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deletePolicy(workspaceSlug: string, policyId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/policies/${policyId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // Group Policies
  // ============================================================================

  async attachPolicyToGroup(
    workspaceSlug: string,
    groupId: string,
    policyId: string
  ): Promise<void> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/groups/${groupId}/policies/`,
      { policy: policyId }
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async detachPolicyFromGroup(
    workspaceSlug: string,
    groupId: string,
    attachmentId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/groups/${groupId}/policies/${attachmentId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // User Policies
  // ============================================================================

  async fetchUserPolicies(workspaceSlug: string): Promise<any[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/user-policies/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async assignPolicyToUser(
    workspaceSlug: string,
    userId: string,
    policyId: string
  ): Promise<void> {
    return this.attachPolicyToUser(workspaceSlug, userId, policyId);
  }

  async removePolicyFromUser(
    workspaceSlug: string,
    userId: string,
    policyId: string
  ): Promise<void> {
    // First find the attachment, then delete it
    const userPolicies = await this.fetchUserPolicies(workspaceSlug);
    const attachment = userPolicies.find(
      (up: any) => up.user === userId && up.policy === policyId
    );
    if (attachment) {
      return this.detachPolicyFromUser(workspaceSlug, attachment.id);
    }
    throw new Error("Policy attachment not found");
  }

  async attachPolicyToUser(
    workspaceSlug: string,
    userId: string,
    policyId: string
  ): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/user-policies/`, {
      user: userId,
      policy: policyId,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async detachPolicyFromUser(
    workspaceSlug: string,
    attachmentId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/user-policies/${attachmentId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // ============================================================================
  // Project Groups (visual grouping)
  // ============================================================================

  async fetchProjectGroups(workspaceSlug: string): Promise<IProjectGroup[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/project-groups/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchProjectGroup(
    workspaceSlug: string,
    projectGroupId: string
  ): Promise<IProjectGroup> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/project-groups/${projectGroupId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createProjectGroup(
    workspaceSlug: string,
    data: Partial<IProjectGroup>
  ): Promise<IProjectGroup> {
    return this.post(`/api/workspaces/${workspaceSlug}/project-groups/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateProjectGroup(
    workspaceSlug: string,
    projectGroupId: string,
    data: Partial<IProjectGroup>
  ): Promise<IProjectGroup> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/project-groups/${projectGroupId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteProjectGroup(
    workspaceSlug: string,
    projectGroupId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/project-groups/${projectGroupId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

export const iamService = new IAMService();
