/**
 * IAM Action Constants
 *
 * Actions follow the format: resource:action
 * Examples: project:read, issue:create, page:delete
 */

export const ACTIONS = {
  // Project actions
  PROJECT: {
    CREATE: "project:create",
    READ: "project:read",
    UPDATE: "project:update",
    DELETE: "project:delete",
    ARCHIVE: "project:archive",
    ALL: "project:*",
  },

  // Issue actions
  ISSUE: {
    CREATE: "issue:create",
    READ: "issue:read",
    UPDATE: "issue:update",
    DELETE: "issue:delete",
    ASSIGN: "issue:assign",
    COMMENT: "issue:comment",
    ALL: "issue:*",
  },

  // Page actions
  PAGE: {
    CREATE: "page:create",
    READ: "page:read",
    UPDATE: "page:update",
    DELETE: "page:delete",
    PUBLISH: "page:publish",
    ALL: "page:*",
  },

  // Cycle actions
  CYCLE: {
    CREATE: "cycle:create",
    READ: "cycle:read",
    UPDATE: "cycle:update",
    DELETE: "cycle:delete",
    ALL: "cycle:*",
  },

  // Module actions
  MODULE: {
    CREATE: "module:create",
    READ: "module:read",
    UPDATE: "module:update",
    DELETE: "module:delete",
    ALL: "module:*",
  },

  // View actions
  VIEW: {
    CREATE: "view:create",
    READ: "view:read",
    UPDATE: "view:update",
    DELETE: "view:delete",
    ALL: "view:*",
  },

  // Label actions
  LABEL: {
    CREATE: "label:create",
    READ: "label:read",
    UPDATE: "label:update",
    DELETE: "label:delete",
    ALL: "label:*",
  },

  // State actions
  STATE: {
    CREATE: "state:create",
    READ: "state:read",
    UPDATE: "state:update",
    DELETE: "state:delete",
    ALL: "state:*",
  },

  // Member actions
  MEMBER: {
    CREATE: "member:create",
    READ: "member:read",
    UPDATE: "member:update",
    DELETE: "member:delete",
    INVITE: "member:invite",
    ALL: "member:*",
  },

  // IAM Group actions
  GROUP: {
    CREATE: "group:create",
    READ: "group:read",
    UPDATE: "group:update",
    DELETE: "group:delete",
    ADD_MEMBER: "group:add_member",
    REMOVE_MEMBER: "group:remove_member",
    ALL: "group:*",
  },

  // Policy actions
  POLICY: {
    CREATE: "policy:create",
    READ: "policy:read",
    UPDATE: "policy:update",
    DELETE: "policy:delete",
    ATTACH: "policy:attach",
    DETACH: "policy:detach",
    ALL: "policy:*",
  },

  // Project Group actions (visual grouping)
  PROJECT_GROUP: {
    CREATE: "project_group:create",
    READ: "project_group:read",
    UPDATE: "project_group:update",
    DELETE: "project_group:delete",
    ALL: "project_group:*",
  },

  // Wildcard - all actions
  ALL: "*",
} as const;

/**
 * Type for action strings
 */
export type TAction =
  | (typeof ACTIONS.PROJECT)[keyof typeof ACTIONS.PROJECT]
  | (typeof ACTIONS.ISSUE)[keyof typeof ACTIONS.ISSUE]
  | (typeof ACTIONS.PAGE)[keyof typeof ACTIONS.PAGE]
  | (typeof ACTIONS.CYCLE)[keyof typeof ACTIONS.CYCLE]
  | (typeof ACTIONS.MODULE)[keyof typeof ACTIONS.MODULE]
  | (typeof ACTIONS.VIEW)[keyof typeof ACTIONS.VIEW]
  | (typeof ACTIONS.LABEL)[keyof typeof ACTIONS.LABEL]
  | (typeof ACTIONS.STATE)[keyof typeof ACTIONS.STATE]
  | (typeof ACTIONS.MEMBER)[keyof typeof ACTIONS.MEMBER]
  | (typeof ACTIONS.GROUP)[keyof typeof ACTIONS.GROUP]
  | (typeof ACTIONS.POLICY)[keyof typeof ACTIONS.POLICY]
  | (typeof ACTIONS.PROJECT_GROUP)[keyof typeof ACTIONS.PROJECT_GROUP]
  | typeof ACTIONS.ALL
  | string; // Allow custom actions
