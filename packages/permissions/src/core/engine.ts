/**
 * IAM Policy Engine - Core evaluation logic.
 * INTERNAL MODULE - use the `can` function from index.ts instead.
 */

import type {
  IEvaluationContext,
  IPolicyDocument,
  IStatement,
  TConditionBlock,
  TConditionOperator,
} from "../types";

/**
 * Condition operator functions
 */
const CONDITION_OPERATORS: Record<
  TConditionOperator,
  (actual: unknown, expected: unknown) => boolean
> = {
  StringEquals: (a, b) => String(a) === String(b),
  StringNotEquals: (a, b) => String(a) !== String(b),
  StringLike: (a, b) => matchWildcard(String(a), String(b)),
  StringNotLike: (a, b) => !matchWildcard(String(a), String(b)),
  NumericEquals: (a, b) => Number(a) === Number(b),
  NumericNotEquals: (a, b) => Number(a) !== Number(b),
  NumericLessThan: (a, b) => Number(a) < Number(b),
  NumericLessThanEquals: (a, b) => Number(a) <= Number(b),
  NumericGreaterThan: (a, b) => Number(a) > Number(b),
  NumericGreaterThanEquals: (a, b) => Number(a) >= Number(b),
  Bool: (a, b) => Boolean(a) === (String(b).toLowerCase() === "true"),
  Null: (a, b) => (a === null || a === undefined) === (String(b).toLowerCase() === "true"),
  "ForAnyValue:StringEquals": (a, b) => {
    const arr = Array.isArray(a) ? a : [a];
    return arr.some((v) => String(v) === String(b));
  },
  "ForAllValues:StringEquals": (a, b) => {
    const arr = Array.isArray(a) ? a : [a];
    return arr.every((v) => String(v) === String(b));
  },
};

/**
 * Match a string against a wildcard pattern
 * Supports * for any characters
 */
function matchWildcard(str: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*") // Convert * to .*
    .replace(/\?/g, "."); // Convert ? to .

  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(str);
}

/**
 * Get a nested value from an object using dot notation
 * @example getNestedValue({a: {b: 1}}, "a.b") => 1
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Interpolate ${...} variables in a string
 * @example interpolateVariables("${actor.email}", context) => "user@example.com"
 */
function interpolateVariables(value: unknown, context: IEvaluationContext): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(/\$\{([^}]+)\}/g, (_, varPath: string) => {
    const varValue = getNestedValue(context as unknown as Record<string, unknown>, varPath);
    return varValue !== undefined ? String(varValue) : "";
  });
}

/**
 * Check if an action matches any of the patterns
 * Supports wildcards: "*" matches all, "project:*" matches all project actions
 */
function matchesAction(patterns: string[], action: string): boolean {
  for (const pattern of patterns) {
    if (pattern === "*") {
      return true;
    }
    if (matchWildcard(action, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluate conditions against context
 * All conditions must match (AND logic)
 */
function evaluateConditions(
  conditions: TConditionBlock | undefined,
  context: IEvaluationContext
): boolean {
  if (!conditions) {
    return true;
  }

  for (const [operator, conditionBlock] of Object.entries(conditions)) {
    const opFunc = CONDITION_OPERATORS[operator as TConditionOperator];
    if (!opFunc) {
      // Unknown operator - skip (fail open for forward compatibility)
      continue;
    }

    for (const [key, expectedValue] of Object.entries(conditionBlock || {})) {
      // Interpolate variables in expected value
      const interpolated = interpolateVariables(expectedValue, context);

      // Get actual value from context
      const actualValue = getNestedValue(context as unknown as Record<string, unknown>, key);

      try {
        if (!opFunc(actualValue, interpolated)) {
          return false;
        }
      } catch {
        // Type conversion failed - condition not met
        return false;
      }
    }
  }

  return true;
}

/**
 * Policy Engine class for evaluating permissions
 */
export class PolicyEngine {
  /**
   * Evaluate if an action is allowed based on policies and context.
   *
   * AWS-like evaluation logic:
   * 1. Default deny
   * 2. Collect all applicable statements
   * 3. If any explicit deny matches, return false
   * 4. If any allow matches (and no deny), return true
   * 5. Otherwise, return false (implicit deny)
   */
  evaluate(policies: IPolicyDocument[], action: string, context: IEvaluationContext): boolean {
    const allowStatements: IStatement[] = [];
    const denyStatements: IStatement[] = [];

    for (const policy of policies) {
      for (const statement of policy.statements) {
        if (matchesAction(statement.actions, action)) {
          if (evaluateConditions(statement.conditions, context)) {
            if (statement.effect === "allow") {
              allowStatements.push(statement);
            } else {
              denyStatements.push(statement);
            }
          }
        }
      }
    }

    // Explicit deny takes precedence
    if (denyStatements.length > 0) {
      return false;
    }

    // Check for allow
    if (allowStatements.length > 0) {
      return true;
    }

    // Implicit deny
    return false;
  }
}

// Singleton instance
const engineInstance = new PolicyEngine();

/**
 * Get the singleton PolicyEngine instance
 */
export function getEngine(): PolicyEngine {
  return engineInstance;
}
