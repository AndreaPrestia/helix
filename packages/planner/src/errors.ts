import { DomainError } from '@helix/core';

/** Base class for planner failures. */
export abstract class PlannerError extends DomainError {}

/** Raised when a plan cannot be constructed. Carries all issues found. */
export class PlanValidationError extends PlannerError {
  readonly code = 'PLAN_VALIDATION_ERROR';

  constructor(readonly issues: readonly string[]) {
    super(`invalid plan: ${issues.join('; ')}`);
  }
}
