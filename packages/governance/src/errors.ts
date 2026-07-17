import { DomainError } from '@helix/core';

/** Base class for governance-engine failures. */
export abstract class GovernanceError extends DomainError {}

/** Raised when spec, delta, or manifest text cannot be parsed. */
export class ParseError extends GovernanceError {
  readonly code = 'GOVERNANCE_PARSE_ERROR';

  constructor(
    readonly artifact: string,
    detail: string,
  ) {
    super(`${artifact}: ${detail}`);
  }
}

/** Raised when a change's structure is invalid. Carries all issues found. */
export class ChangeValidationError extends GovernanceError {
  readonly code = 'CHANGE_VALIDATION_ERROR';

  constructor(
    readonly changeId: string,
    readonly issues: readonly string[],
  ) {
    super(`change "${changeId}" is invalid: ${issues.join('; ')}`);
  }
}

/** Raised when a delta cannot be applied to a baseline spec. */
export class DeltaConflictError extends GovernanceError {
  readonly code = 'DELTA_CONFLICT';

  constructor(
    readonly capability: string,
    detail: string,
  ) {
    super(`delta for "${capability}": ${detail}`);
  }
}
