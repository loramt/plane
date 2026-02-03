/**
 * IAM Permission Types
 */

/**
 * Effect of a policy statement
 */
export type TEffect = "allow" | "deny";

/**
 * Condition operator types
 */
export type TConditionOperator =
  | "StringEquals"
  | "StringNotEquals"
  | "StringLike"
  | "StringNotLike"
  | "NumericEquals"
  | "NumericNotEquals"
  | "NumericLessThan"
  | "NumericLessThanEquals"
  | "NumericGreaterThan"
  | "NumericGreaterThanEquals"
  | "Bool"
  | "Null"
  | "ForAnyValue:StringEquals"
  | "ForAllValues:StringEquals";

/**
 * Condition block - maps operators to condition checks
 */
export type TConditionBlock = {
  [K in TConditionOperator]?: Record<string, string | number | boolean>;
};

/**
 * A single policy statement
 */
export interface IStatement {
  sid?: string;
  effect: TEffect;
  actions: string[];
  resources: string[];
  conditions?: TConditionBlock;
}

/**
 * A complete policy document
 */
export interface IPolicyDocument {
  statements: IStatement[];
}

/**
 * Policy model from API
 */
export interface IPolicy {
  id: string;
  name: string;
  description?: string;
  document: IPolicyDocument;
  is_managed: boolean;
  user_count?: number;
  workspace: string;
  created_at: string;
  updated_at: string;
}

/**
 * IAM Group model
 */
export interface IGroup {
  id: string;
  name: string;
  description?: string;
  workspace: string;
  created_at: string;
  updated_at: string;
}

/**
 * Group member model
 */
export interface IGroupMember {
  id: string;
  group: string;
  member: string;
  workspace: string;
  created_at: string;
}

/**
 * Project group for visual organization
 */
export interface IProjectGroup {
  id: string;
  name: string;
  description?: string;
  workspace: string;
  color?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Actor information for permission checks
 */
export interface IActor {
  id: string;
  email: string;
  groups?: string[];
}

/**
 * Resource information for permission checks
 */
export interface IResource {
  workspace_id?: string;
  workspace_slug?: string;
  project_id?: string;
  project_group_id?: string;
  project_group_name?: string;
  id?: string;
  type?: string;
  created_by?: string;
  [key: string]: unknown;
}

/**
 * Evaluation context for policy engine
 */
export interface IEvaluationContext {
  actor: {
    id: string;
    email: string;
    groups: string[];
  };
  resource: {
    workspace_id?: string;
    workspace_slug?: string;
    project_id?: string;
    group?: {
      id?: string;
      name?: string;
    };
    id?: string;
    type?: string;
    created_by?: string;
    [key: string]: unknown;
  };
}

/**
 * Response from my-policies endpoint
 */
export interface IMyPoliciesResponse {
  policies: IPolicy[];
  groups: IGroup[];
  actor: IActor;
  is_owner: boolean;
}
