import { Entity, Identifier, type IdGenerator, type Result, err, ok } from '@helix/core';
import {
  ApprovalBlockedError,
  type ReviewError,
  ReviewStateError,
  ReviewValidationError,
  ReviewerIndependenceError,
} from './errors.js';
import {
  type ApprovalPolicy,
  type Finding,
  type FindingInput,
  type ReviewState,
  defaultApprovalPolicy,
  isFindingSeverity,
} from './model.js';

/** Typed identifier for a review. */
export type ReviewId = Identifier<'rev'>;

/** Ports required to run a review deterministically. */
export interface ReviewDependencies {
  readonly ids: IdGenerator;
}

/** Parameters for opening a review. */
export interface OpenReviewParams {
  readonly author: string;
  readonly reviewer: string;
}

/**
 * A review of produced work. An independent reviewer (distinct from the author)
 * records findings with severities; approval is blocked while any finding of a
 * blocking severity is open (Constitution Article 8). Requesting changes starts
 * a rework loop that returns to review on resubmission.
 */
export class Review extends Entity<ReviewId> {
  readonly #author: string;
  readonly #reviewer: string;
  #state: ReviewState;
  #findings: Finding[];
  #round: number;

  private constructor(id: ReviewId, author: string, reviewer: string) {
    super(id);
    this.#author = author;
    this.#reviewer = reviewer;
    this.#state = 'in_review';
    this.#findings = [];
    this.#round = 1;
  }

  get author(): string {
    return this.#author;
  }
  get reviewer(): string {
    return this.#reviewer;
  }
  get state(): ReviewState {
    return this.#state;
  }
  get findings(): readonly Finding[] {
    return [...this.#findings];
  }
  get round(): number {
    return this.#round;
  }

  /** Open a review. The reviewer MUST be independent from the author. */
  static open(id: ReviewId, params: OpenReviewParams): Result<Review, ReviewError> {
    if (params.author.trim() === '') {
      return err(new ReviewValidationError('author must be non-empty'));
    }
    if (params.reviewer.trim() === '') {
      return err(new ReviewValidationError('reviewer must be non-empty'));
    }
    if (params.author === params.reviewer) {
      return err(new ReviewerIndependenceError(params.author));
    }
    return ok(new Review(id, params.author, params.reviewer));
  }

  /** Record a finding while the review is in progress. */
  addFinding(input: FindingInput, deps: ReviewDependencies): Result<Finding, ReviewError> {
    if (this.#state !== 'in_review') {
      return err(new ReviewStateError(`review is ${this.#state}`));
    }
    if (!isFindingSeverity(input.severity)) {
      return err(new ReviewValidationError(`invalid severity: ${String(input.severity)}`));
    }
    if (input.message.trim() === '') {
      return err(new ReviewValidationError('finding message must be non-empty'));
    }
    const finding: Finding = {
      id: deps.ids.next(),
      severity: input.severity,
      message: input.message,
    };
    this.#findings.push(finding);
    return ok(finding);
  }

  /** Approve the review unless blocked by outstanding findings (approval rules). */
  approve(policy: ApprovalPolicy = defaultApprovalPolicy): Result<Review, ReviewError> {
    if (this.#state !== 'in_review') {
      return err(new ReviewStateError(`review is ${this.#state}`));
    }
    const blocking = new Set(policy.blockingSeverities);
    const blockingFindings = this.#findings.filter((finding) => blocking.has(finding.severity));
    if (blockingFindings.length > 0) {
      return err(new ApprovalBlockedError(blockingFindings.map((finding) => finding.id)));
    }
    this.#state = 'approved';
    return ok(this);
  }

  /** Request rework. Requires at least one finding explaining what to change. */
  requestChanges(): Result<Review, ReviewError> {
    if (this.#state !== 'in_review') {
      return err(new ReviewStateError(`review is ${this.#state}`));
    }
    if (this.#findings.length === 0) {
      return err(new ReviewValidationError('cannot request changes without findings'));
    }
    this.#state = 'changes_requested';
    return ok(this);
  }

  /** Resubmit after rework: begin a fresh review round with cleared findings. */
  resubmit(): Result<Review, ReviewError> {
    if (this.#state !== 'changes_requested') {
      return err(new ReviewStateError(`review is ${this.#state}`));
    }
    this.#state = 'in_review';
    this.#findings = [];
    this.#round += 1;
    return ok(this);
  }
}
