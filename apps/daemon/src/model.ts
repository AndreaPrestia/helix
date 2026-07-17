/** Lifecycle status of the daemon. */
export type DaemonStatus = 'running' | 'draining' | 'stopped';

/** Status of a workspace session. */
export type SessionStatus = 'active' | 'closed';

/** A workspace session tracked by the daemon. */
export interface WorkspaceSession {
  readonly id: string;
  readonly workspaceRoot: string;
  readonly status: SessionStatus;
  /** ISO-8601 instant the session was opened. */
  readonly openedAt: string;
  /** ISO-8601 instant the session was closed, when applicable. */
  readonly closedAt?: string;
}

/** Status of a scheduled job. */
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

/** A unit of work scheduled against a session. */
export interface Job {
  readonly id: string;
  readonly sessionId: string;
  readonly kind: string;
  readonly status: JobStatus;
  /** Monotonic enqueue sequence, giving a deterministic FIFO order. */
  readonly sequence: number;
  /** ISO-8601 instant the job was enqueued. */
  readonly enqueuedAt: string;
  /** ISO-8601 instant the job started running, when applicable. */
  readonly startedAt?: string;
  /** ISO-8601 instant the job reached a terminal state, when applicable. */
  readonly finishedAt?: string;
  /** Failure detail for a failed job. */
  readonly failure?: string;
}

/** Terminal job statuses. */
export const terminalJobStatuses: readonly JobStatus[] = ['succeeded', 'failed', 'canceled'];

/** Whether a job status is terminal. */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return terminalJobStatuses.includes(status);
}

/** A point-in-time, serializable snapshot of the daemon's durable state. */
export interface DaemonSnapshot {
  readonly sessions: readonly WorkspaceSession[];
  readonly jobs: readonly Job[];
  readonly sequence: number;
}
