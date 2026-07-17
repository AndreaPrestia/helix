/**
 * `@helix/review` — the review engine.
 *
 * Models independent review of produced work: review contracts, an independent
 * reviewer (distinct from the author), severity-graded findings, deny-by-default
 * approval rules, and a rework loop (Constitution Articles 7, 8). Depends only
 * on `@helix/core`.
 */

export {
  reviewStates,
  findingSeverities,
  isFindingSeverity,
  defaultApprovalPolicy,
  type ReviewState,
  type FindingSeverity,
  type Finding,
  type FindingInput,
  type ApprovalPolicy,
} from './model.js';
export {
  ReviewError,
  ReviewValidationError,
  ReviewerIndependenceError,
  ReviewStateError,
  ApprovalBlockedError,
} from './errors.js';
export { Review, type ReviewId, type ReviewDependencies, type OpenReviewParams } from './review.js';
