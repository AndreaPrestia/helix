import { type Option, fromNullable } from '@helix/core';
import type {
  DashboardSnapshot,
  DashboardSummary,
  FailureView,
  JobRecord,
  JobStatus,
  RunView,
  SessionRecord,
  TaskView,
} from './model.js';
import { jobStatuses } from './model.js';
import type { DashboardSource } from './source.js';

/** The default number of items returned by a list view (mobile-friendly). */
export const DEFAULT_VIEW_LIMIT = 20;
/** The maximum number of items any list view will return. */
export const MAX_VIEW_LIMIT = 200;

function boundLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isInteger(limit) || limit < 1) {
    return DEFAULT_VIEW_LIMIT;
  }
  return Math.min(limit, MAX_VIEW_LIMIT);
}

function sortedSessions(snapshot: DashboardSnapshot): readonly SessionRecord[] {
  return [...snapshot.sessions].sort((a, b) => a.id.localeCompare(b.id));
}

function sortedJobs(snapshot: DashboardSnapshot): readonly JobRecord[] {
  return [...snapshot.jobs].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

function toTask(session: SessionRecord): TaskView {
  return {
    id: session.id,
    workspaceRoot: session.workspaceRoot,
    status: session.status,
    openedAt: session.openedAt,
  };
}

function toRun(job: JobRecord): RunView {
  return { id: job.id, sessionId: job.sessionId, kind: job.kind, status: job.status };
}

/**
 * Projects daemon state into read-only, mobile-friendly view models: a compact
 * summary, plus bounded lists of tasks (sessions), runs (jobs), and failures.
 * All output is deterministic and id/sequence-sorted; lists are bounded so the
 * views stay small on constrained screens.
 */
export class Dashboard {
  readonly #source: DashboardSource;

  constructor(source: DashboardSource) {
    this.#source = source;
  }

  /** A compact overview suitable for a mobile screen. */
  summary(): DashboardSummary {
    const snapshot = this.#source.snapshot();
    const runs = Object.fromEntries(jobStatuses.map((status) => [status, 0])) as Record<
      JobStatus,
      number
    >;
    for (const job of snapshot.jobs) {
      runs[job.status] += 1;
    }
    let active = 0;
    let closed = 0;
    for (const session of snapshot.sessions) {
      if (session.status === 'active') {
        active += 1;
      } else {
        closed += 1;
      }
    }
    return {
      sessions: { active, closed },
      runs,
      failures: runs.failed,
      needsReview: runs.failed,
    };
  }

  /** Tasks (workspace sessions), id-sorted and bounded. */
  tasks(limit?: number): readonly TaskView[] {
    return sortedSessions(this.#source.snapshot()).slice(0, boundLimit(limit)).map(toTask);
  }

  /** Runs (jobs), optionally filtered by status, sequence-sorted and bounded. */
  runs(status?: JobStatus, limit?: number): readonly RunView[] {
    const jobs = sortedJobs(this.#source.snapshot());
    const filtered = status === undefined ? jobs : jobs.filter((job) => job.status === status);
    return filtered.slice(0, boundLimit(limit)).map(toRun);
  }

  /** Failed runs surfaced for review, sequence-sorted and bounded. */
  failures(limit?: number): readonly FailureView[] {
    return sortedJobs(this.#source.snapshot())
      .filter((job) => job.status === 'failed')
      .slice(0, boundLimit(limit))
      .map((job) => ({
        id: job.id,
        sessionId: job.sessionId,
        kind: job.kind,
        failure: job.failure ?? 'unknown',
        ...(job.finishedAt !== undefined ? { finishedAt: job.finishedAt } : {}),
      }));
  }

  /** A single task by id. */
  task(id: string): Option<TaskView> {
    const session = this.#source.snapshot().sessions.find((candidate) => candidate.id === id);
    return fromNullable(session === undefined ? undefined : toTask(session));
  }

  /** A single run by id. */
  run(id: string): Option<RunView> {
    const job = this.#source.snapshot().jobs.find((candidate) => candidate.id === id);
    return fromNullable(job === undefined ? undefined : toRun(job));
  }
}
