/** Base class for all dashboard errors. Every error carries a stable `code`. */
export abstract class DashboardError extends Error {
  abstract readonly code: string;
}

/** Raised when a request carries no valid authentication token. */
export class UnauthenticatedError extends DashboardError {
  readonly code = 'UNAUTHENTICATED';
  constructor() {
    super('a valid authentication token is required');
  }
}

/** Raised when a mutating request is made while the dashboard is read-only. */
export class ReadOnlyError extends DashboardError {
  readonly code = 'READ_ONLY';
  constructor(readonly action: string) {
    super(`the dashboard is read-only; "${action}" is not permitted`);
  }
}
