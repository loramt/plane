/**
 * IAM Store
 *
 * MobX store for IAM state management.
 * Stores policies, groups, and project groups for the current workspace.
 */
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import type {
  IActor,
  IGroup,
  IPolicy,
  IPolicyDocument,
  IProjectGroup,
} from "@plane/permissions";
import { invalidatePolicyCache } from "@plane/permissions";
import { iamService } from "@/services/iam.service";
import type { CoreRootStore } from "./root.store";

export interface IIAMStore {
  // Observables
  myPolicies: IPolicyDocument[];
  myGroups: IGroup[];
  actor: IActor | null;
  projectGroups: Record<string, IProjectGroup>;
  allGroups: Record<string, IGroup>;
  allPolicies: Record<string, IPolicy>;
  isLoading: boolean;
  error: string | null;

  // Computed
  projectGroupsList: IProjectGroup[];
  groupsList: IGroup[];
  policiesList: IPolicy[];
  hasIAMPolicies: boolean;

  // Actions
  fetchMyPolicies: (workspaceSlug: string) => Promise<void>;
  fetchProjectGroups: (workspaceSlug: string) => Promise<void>;
  fetchGroups: (workspaceSlug: string) => Promise<void>;
  fetchPolicies: (workspaceSlug: string) => Promise<void>;
  createGroup: (workspaceSlug: string, data: Partial<IGroup>) => Promise<IGroup>;
  updateGroup: (workspaceSlug: string, groupId: string, data: Partial<IGroup>) => Promise<IGroup>;
  deleteGroup: (workspaceSlug: string, groupId: string) => Promise<void>;
  createPolicy: (workspaceSlug: string, data: Partial<IPolicy>) => Promise<IPolicy>;
  updatePolicy: (workspaceSlug: string, policyId: string, data: Partial<IPolicy>) => Promise<IPolicy>;
  deletePolicy: (workspaceSlug: string, policyId: string) => Promise<void>;
  createProjectGroup: (workspaceSlug: string, data: Partial<IProjectGroup>) => Promise<IProjectGroup>;
  updateProjectGroup: (workspaceSlug: string, id: string, data: Partial<IProjectGroup>) => Promise<IProjectGroup>;
  deleteProjectGroup: (workspaceSlug: string, id: string) => Promise<void>;
  reset: () => void;
}

export class IAMStore implements IIAMStore {
  // Observables
  myPolicies: IPolicyDocument[] = [];
  myGroups: IGroup[] = [];
  actor: IActor | null = null;
  projectGroups: Record<string, IProjectGroup> = {};
  allGroups: Record<string, IGroup> = {};
  allPolicies: Record<string, IPolicy> = {};
  isLoading = false;
  error: string | null = null;

  // Root store reference
  rootStore: CoreRootStore;

  constructor(rootStore: CoreRootStore) {
    makeObservable(this, {
      // Observables
      myPolicies: observable,
      myGroups: observable,
      actor: observable,
      projectGroups: observable,
      allGroups: observable,
      allPolicies: observable,
      isLoading: observable,
      error: observable,

      // Computed
      projectGroupsList: computed,
      groupsList: computed,
      policiesList: computed,
      hasIAMPolicies: computed,

      // Actions
      fetchMyPolicies: action,
      fetchProjectGroups: action,
      fetchGroups: action,
      fetchPolicies: action,
      createGroup: action,
      updateGroup: action,
      deleteGroup: action,
      createPolicy: action,
      updatePolicy: action,
      deletePolicy: action,
      createProjectGroup: action,
      updateProjectGroup: action,
      deleteProjectGroup: action,
      reset: action,
    });

    this.rootStore = rootStore;
  }

  // ============================================================================
  // Computed
  // ============================================================================

  get projectGroupsList(): IProjectGroup[] {
    return Object.values(this.projectGroups).sort(
      (a, b) => a.sort_order - b.sort_order
    );
  }

  get groupsList(): IGroup[] {
    return Object.values(this.allGroups).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  get policiesList(): IPolicy[] {
    return Object.values(this.allPolicies).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  get hasIAMPolicies(): boolean {
    return this.myPolicies.length > 0;
  }

  // ============================================================================
  // Actions - My Policies
  // ============================================================================

  fetchMyPolicies = async (workspaceSlug: string): Promise<void> => {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const response = await iamService.fetchMyPolicies(workspaceSlug);

      runInAction(() => {
        this.myPolicies = response.policies.map((p) => p.document);
        this.myGroups = response.groups;
        this.actor = response.actor;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = "Failed to fetch policies";
        this.isLoading = false;
      });
      throw error;
    }
  };

  // ============================================================================
  // Actions - Project Groups
  // ============================================================================

  fetchProjectGroups = async (workspaceSlug: string): Promise<void> => {
    try {
      const response = await iamService.fetchProjectGroups(workspaceSlug);

      runInAction(() => {
        this.projectGroups = response.reduce(
          (acc, group) => ({ ...acc, [group.id]: group }),
          {}
        );
      });
    } catch (error) {
      throw error;
    }
  };

  createProjectGroup = async (
    workspaceSlug: string,
    data: Partial<IProjectGroup>
  ): Promise<IProjectGroup> => {
    const response = await iamService.createProjectGroup(workspaceSlug, data);

    runInAction(() => {
      this.projectGroups[response.id] = response;
    });

    return response;
  };

  updateProjectGroup = async (
    workspaceSlug: string,
    id: string,
    data: Partial<IProjectGroup>
  ): Promise<IProjectGroup> => {
    const response = await iamService.updateProjectGroup(workspaceSlug, id, data);

    runInAction(() => {
      this.projectGroups[id] = response;
    });

    return response;
  };

  deleteProjectGroup = async (
    workspaceSlug: string,
    id: string
  ): Promise<void> => {
    await iamService.deleteProjectGroup(workspaceSlug, id);

    runInAction(() => {
      delete this.projectGroups[id];
    });
  };

  // ============================================================================
  // Actions - Groups
  // ============================================================================

  fetchGroups = async (workspaceSlug: string): Promise<void> => {
    const response = await iamService.fetchGroups(workspaceSlug);

    runInAction(() => {
      this.allGroups = response.reduce(
        (acc, group) => ({ ...acc, [group.id]: group }),
        {}
      );
    });
  };

  createGroup = async (
    workspaceSlug: string,
    data: Partial<IGroup>
  ): Promise<IGroup> => {
    const response = await iamService.createGroup(workspaceSlug, data);

    runInAction(() => {
      this.allGroups[response.id] = response;
    });

    return response;
  };

  updateGroup = async (
    workspaceSlug: string,
    groupId: string,
    data: Partial<IGroup>
  ): Promise<IGroup> => {
    const response = await iamService.updateGroup(workspaceSlug, groupId, data);

    runInAction(() => {
      this.allGroups[groupId] = response;
    });

    return response;
  };

  deleteGroup = async (workspaceSlug: string, groupId: string): Promise<void> => {
    await iamService.deleteGroup(workspaceSlug, groupId);

    runInAction(() => {
      delete this.allGroups[groupId];
    });

    // Invalidate policy cache as group policies may have changed
    if (this.actor?.id) {
      invalidatePolicyCache(this.actor.id, workspaceSlug);
    }
  };

  // ============================================================================
  // Actions - Policies
  // ============================================================================

  fetchPolicies = async (workspaceSlug: string): Promise<void> => {
    const response = await iamService.fetchPolicies(workspaceSlug);

    runInAction(() => {
      this.allPolicies = response.reduce(
        (acc, policy) => ({ ...acc, [policy.id]: policy }),
        {}
      );
    });
  };

  createPolicy = async (
    workspaceSlug: string,
    data: Partial<IPolicy>
  ): Promise<IPolicy> => {
    const response = await iamService.createPolicy(workspaceSlug, data);

    runInAction(() => {
      this.allPolicies[response.id] = response;
    });

    return response;
  };

  updatePolicy = async (
    workspaceSlug: string,
    policyId: string,
    data: Partial<IPolicy>
  ): Promise<IPolicy> => {
    const response = await iamService.updatePolicy(workspaceSlug, policyId, data);

    runInAction(() => {
      this.allPolicies[policyId] = response;
    });

    // Invalidate policy cache as policy content may have changed
    if (this.actor?.id) {
      invalidatePolicyCache(this.actor.id, workspaceSlug);
    }

    return response;
  };

  deletePolicy = async (workspaceSlug: string, policyId: string): Promise<void> => {
    await iamService.deletePolicy(workspaceSlug, policyId);

    runInAction(() => {
      delete this.allPolicies[policyId];
    });

    // Invalidate policy cache
    if (this.actor?.id) {
      invalidatePolicyCache(this.actor.id, workspaceSlug);
    }
  };

  // ============================================================================
  // Reset
  // ============================================================================

  reset = (): void => {
    runInAction(() => {
      this.myPolicies = [];
      this.myGroups = [];
      this.actor = null;
      this.projectGroups = {};
      this.allGroups = {};
      this.allPolicies = {};
      this.isLoading = false;
      this.error = null;
    });
  };
}
