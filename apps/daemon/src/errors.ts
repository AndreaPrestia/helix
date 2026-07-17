/** Base class for all daemon errors. Every error carries a stable `code`. */
export abstract class DaemonError extends Error {
  abstract readonly code: string;
}

/** Raised when a session id is not known to the daemon. */
export class SessionNotFoundError extends DaemonError {
  readonly code = 'SESSION_NOT_FOUND';
  constructor(readonly sessionId: string) {
    super(`no session with id "${sessionId}"`);
  }
}

/** Raised when opening a session for a workspace that already has an active session. */
export class DuplicateSessionError extends DaemonError {
  readonly code = 'DUPLICATE_SESSION';
  constructor(readonly workspaceRoot: string) {
    super(`a session is already active for workspace "${workspaceRoot}"`);
  }
}

/** Raised when a job id is not known to the daemon. */
export class JobNotFoundError extends DaemonError {
  readonly code = 'JOB_NOT_FOUND';
  constructor(readonly jobId: string) {
    super(`no job with id "${jobId}"`);
  }
}

/** Raised when an operation requires a job to be in a different state. */
export class InvalidJobStateError extends DaemonError {
  readonly code = 'INVALID_JOB_STATE';
  constructor(
    readonly jobId: string,
    readonly from: string,
    readonly to: string,
  ) {
    super(`job "${jobId}" cannot transition from ${from} to ${to}`);
  }
}

/** Raised when work is submitted to a daemon that is not accepting it. */
export class DaemonNotAcceptingError extends DaemonError {
  readonly code = 'DAEMON_NOT_ACCEPTING';
  constructor(readonly status: string) {
    super(`daemon is ${status} and not accepting new work`);
  }
}
