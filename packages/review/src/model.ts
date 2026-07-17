/** Review lifecycle states. */
export const reviewStates = ['in_review', 'approved', 'changes_requested'] as const;
export type ReviewState = (typeof reviewStates)[number];

/** Severity of a review finding, from least to most serious. */
export const findingSeverities = ['info', 'minor', 'major', 'blocking'] as const;
export type FindingSeverity = (typeof findingSeverities)[number];

/** Whether a value is a recognized {@link FindingSeverity}. */
export function isFindingSeverity(value: string): value is FindingSeverity {
  return (findingSeverities as readonly string[]).includes(value);
}

/** A review finding. */
export interface Finding {
  readonly id: string;
  readonly severity: FindingSeverity;
  readonly message: string;
}

/** Input for recording a finding (its id is assigned by the review). */
export interface FindingInput {
  readonly severity: FindingSeverity;
  readonly message: string;
}

/** Approval rules: which finding severities block approval (deny-by-default). */
export interface ApprovalPolicy {
  readonly blockingSeverities: readonly FindingSeverity[];
}

/** Default policy: only `blocking` findings prevent approval. */
export const defaultApprovalPolicy: ApprovalPolicy = {
  blockingSeverities: ['blocking'],
};
