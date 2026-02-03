"""
IAM Policy Engine - Core evaluation logic.
INTERNAL MODULE - not exposed directly, use service.py functions.
"""
import fnmatch
import re
from typing import Any, Dict, List, Optional

from .types import Effect, EvaluationContext, PolicyDocument, Statement


class PolicyEngine:
    """
    Core policy evaluation engine.
    Evaluates policy documents against actions and contexts.

    This class is internal - use the `can()` function from service.py instead.
    """

    # Supported condition operators
    CONDITION_OPERATORS = {
        "StringEquals": lambda a, b: str(a) == str(b),
        "StringNotEquals": lambda a, b: str(a) != str(b),
        "StringLike": lambda a, b: fnmatch.fnmatch(str(a), str(b)),
        "StringNotLike": lambda a, b: not fnmatch.fnmatch(str(a), str(b)),
        "NumericEquals": lambda a, b: float(a) == float(b),
        "NumericNotEquals": lambda a, b: float(a) != float(b),
        "NumericLessThan": lambda a, b: float(a) < float(b),
        "NumericLessThanEquals": lambda a, b: float(a) <= float(b),
        "NumericGreaterThan": lambda a, b: float(a) > float(b),
        "NumericGreaterThanEquals": lambda a, b: float(a) >= float(b),
        "Bool": lambda a, b: bool(a) == (str(b).lower() == "true"),
        "Null": lambda a, b: (a is None) == (str(b).lower() == "true"),
        "ForAnyValue:StringEquals": lambda a, b: any(str(v) == str(b) for v in (a if isinstance(a, list) else [a])),
        "ForAllValues:StringEquals": lambda a, b: all(str(v) == str(b) for v in (a if isinstance(a, list) else [a])),
    }

    def evaluate(
        self,
        policies: List[PolicyDocument],
        action: str,
        context: EvaluationContext
    ) -> bool:
        """
        Evaluate if the action is allowed based on policies and context.

        AWS-like evaluation logic:
        1. Default deny
        2. Collect all applicable statements
        3. If any explicit deny matches, return False
        4. If any allow matches (and no deny), return True
        5. Otherwise, return False (implicit deny)

        Args:
            policies: List of policy documents to evaluate
            action: The action being performed (e.g., "project:delete")
            context: The evaluation context

        Returns:
            True if action is allowed, False otherwise
        """
        context_dict = context.to_dict()

        # Collect all matching statements
        allow_statements: List[Statement] = []
        deny_statements: List[Statement] = []

        for policy in policies:
            for statement in policy.statements:
                if self._matches_action(statement.actions, action):
                    if self._evaluate_conditions(statement.conditions, context_dict):
                        if statement.effect == Effect.ALLOW:
                            allow_statements.append(statement)
                        else:
                            deny_statements.append(statement)

        # Explicit deny takes precedence
        if deny_statements:
            return False

        # Check for allow
        if allow_statements:
            return True

        # Implicit deny
        return False

    def _matches_action(self, patterns: List[str], action: str) -> bool:
        """
        Check if action matches any of the patterns.
        Supports wildcards: "*" matches all, "project:*" matches all project actions.

        Args:
            patterns: List of action patterns (e.g., ["project:*", "issue:read"])
            action: The action to check (e.g., "project:delete")

        Returns:
            True if action matches any pattern
        """
        for pattern in patterns:
            if pattern == "*":
                return True
            if fnmatch.fnmatch(action, pattern):
                return True
        return False

    def _evaluate_conditions(
        self,
        conditions: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> bool:
        """
        Evaluate all conditions against the context.
        All conditions must match (AND logic).

        Args:
            conditions: Condition block from statement
            context: Evaluation context as dictionary

        Returns:
            True if all conditions match
        """
        if not conditions:
            return True

        for operator, condition_block in conditions.items():
            if operator not in self.CONDITION_OPERATORS:
                # Unknown operator - skip (fail open for forward compatibility)
                continue

            op_func = self.CONDITION_OPERATORS[operator]

            for key, expected_value in condition_block.items():
                # Interpolate variables in expected value
                expected_value = self._interpolate_variables(expected_value, context)

                # Get actual value from context
                actual_value = self._get_nested_value(context, key)

                try:
                    if not op_func(actual_value, expected_value):
                        return False
                except (TypeError, ValueError):
                    # Type conversion failed - condition not met
                    return False

        return True

    def _interpolate_variables(self, value: Any, context: Dict[str, Any]) -> Any:
        """
        Interpolate ${...} variables in condition values.

        Example:
            "${actor.email}" -> "user@example.com"

        Args:
            value: The value to interpolate
            context: Context dictionary

        Returns:
            Interpolated value
        """
        if not isinstance(value, str):
            return value

        # Find all ${...} patterns
        pattern = r'\$\{([^}]+)\}'

        def replacer(match):
            var_path = match.group(1)
            var_value = self._get_nested_value(context, var_path)
            return str(var_value) if var_value is not None else ""

        return re.sub(pattern, replacer, value)

    def _get_nested_value(self, obj: Dict[str, Any], path: str) -> Any:
        """
        Get nested value from dictionary using dot notation.

        Example:
            _get_nested_value({"a": {"b": 1}}, "a.b") -> 1

        Args:
            obj: Dictionary to search
            path: Dot-separated path (e.g., "resource.group.name")

        Returns:
            Value at path or None if not found
        """
        parts = path.split(".")
        current = obj

        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None

        return current


# Singleton instance for reuse
_engine = PolicyEngine()


def get_engine() -> PolicyEngine:
    """Get the singleton PolicyEngine instance."""
    return _engine
