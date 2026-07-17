/** Status of a workspace session (a "task" in the dashboard vocabulary). */
export type SessionStatus = 'active' | 'closed';

/** A read-only session record consumed by the dashboard. */
export interface SessionRecord {
  readonly id: string;
  readonly workspaceRoot: string;
  readonly status: SessionStatus;
  readonly openedAt: string;
  readonly closedAt?: string;
}

/** Status of a job (a "run" in the dashboard vocabulary). */
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

/** A read-only job record consumed by the dashboard. */
export interface JobRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly kind: string;
  readonly status: JobStatus;
  readonly sequence: number;
  readonly enqueuedAt: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly failure?: string;
}

/** A read-only snapshot of daemon state consumed by the dashboard. */
export interface DashboardSnapshot {
  readonly sessions: readonly SessionRecord[];
  readonly jobs: readonly JobRecord[];
}

/** All job statuses, in display order. */
export const jobStatuses: readonly JobStatus[] = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
];

/** A task (workspace session) as shown on the dashboard. */
export interface TaskView {
  readonly id: string;
  readonly workspaceRoot: string;
  readonly status: SessionStatus;
  readonly openedAt: string;
}

/** A run (job) as shown on the dashboard. */
export interface RunView {
  readonly id: string;
  readonly sessionId: string;
  readonly kind: string;
  readonly status: JobStatus;
}

/** A failed run surfaced for review. */
export interface FailureView {
  readonly id: string;
  readonly sessionId: string;
  readonly kind: string;
  readonly failure: string;
  readonly finishedAt?: string;
}

/** A compact, mobile-friendly overview of daemon activity. */
export interface DashboardSummary {
  readonly sessions: { readonly active: number; readonly closed: number };
  readonly runs: Readonly<Record<JobStatus, number>>;
  /** Number of failed runs (equal to `runs.failed`), surfaced for quick scanning. */
  readonly failures: number;
  /** Number of runs awaiting review (currently, failed runs). */
  readonly needsReview: number;
}
