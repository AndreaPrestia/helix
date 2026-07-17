import { DomainError } from '@helix/core';

/** Base class for review-engine failures. */
export abstract class ReviewError extends DomainError {}

/** Raised when review input is invalid. */
export class ReviewValidationError extends ReviewError {
  readonly code = 'REVIEW_VALIDATION_ERROR';
}

/** Raised when the reviewer is not independent from the author. */
export class ReviewerIndependenceError extends ReviewError {
  readonly code = 'REVIEWER_NOT_INDEPENDENT';

  constructor(readonly actor: string) {
    super(`reviewer must be independent from the author: ${actor}`);
  }
}

/** Raised on an operation incompatible with the current review state. */
export class ReviewStateError extends ReviewError {
  readonly code = 'REVIEW_STATE_ERROR';
}

/** Raised when approval is blocked by outstanding findings. */
export class ApprovalBlockedError extends ReviewError {
  readonly code = 'REVIEW_APPROVAL_BLOCKED';

  constructor(readonly blockingFindingIds: readonly string[]) {
    super(`approval blocked by ${blockingFindingIds.length} finding(s)`);
  }
}
