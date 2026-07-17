/** Base class for all self-hosting workflow errors. Every error carries a `code`. */
export abstract class SelfHostingError extends Error {
  abstract readonly code: string;
}

/** Raised when the requested change is not present in Helix's own specs. */
export class UnknownChangeError extends SelfHostingError {
  readonly code = 'UNKNOWN_CHANGE';
  constructor(readonly changeId: string) {
    super(`no change "${changeId}" in the specification set`);
  }
}

/** Raised when a plan would exceed the bounded step budget. */
export class PlanTooLargeError extends SelfHostingError {
  readonly code = 'PLAN_TOO_LARGE';
  constructor(
    readonly changeId: string,
    readonly steps: number,
    readonly maxSteps: number,
  ) {
    super(`plan for "${changeId}" has ${steps} steps, exceeding the budget of ${maxSteps}`);
  }
}

/** Raised when a plan has no steps to execute. */
export class EmptyPlanError extends SelfHostingError {
  readonly code = 'EMPTY_PLAN';
  constructor(readonly changeId: string) {
    super(`plan for "${changeId}" has no steps`);
  }
}

/** Raised when execution is attempted on a change that is neither approved nor overridden. */
export class NotApprovedError extends SelfHostingError {
  readonly code = 'NOT_APPROVED';
  constructor(readonly changeId: string) {
    super(`change "${changeId}" is not approved; execution requires approval or a manual override`);
  }
}
