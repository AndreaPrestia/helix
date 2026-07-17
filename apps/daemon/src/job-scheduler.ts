import {
  type Clock,
  type IdGenerator,
  type Option,
  type Result,
  err,
  fromNullable,
  none,
  ok,
  some,
} from '@helix/core';
import { InvalidJobStateError, JobNotFoundError } from './errors.js';
import { type Job, type JobStatus, isTerminalJobStatus } from './model.js';

/**
 * A deterministic FIFO scheduler for jobs. Jobs are claimed in enqueue order
 * (by monotonic sequence). Timestamps and identifiers come from injected ports.
 * All listings are ordered by sequence, then id, for stable output.
 */
export class JobScheduler {
  readonly #clock: Clock;
  readonly #ids: IdGenerator;
  readonly #jobs = new Map<string, Job>();
  #sequence: number;

  constructor(clock: Clock, ids: IdGenerator, initialSequence = 0) {
    this.#clock = clock;
    this.#ids = ids;
    this.#sequence = initialSequence;
  }

  /** Enqueue a new job for a session. */
  enqueue(sessionId: string, kind: string): Job {
    const job: Job = {
      id: this.#ids.next(),
      sessionId,
      kind,
      status: 'queued',
      sequence: this.#sequence++,
      enqueuedAt: this.#clock.now().toISOString(),
    };
    this.#jobs.set(job.id, job);
    return job;
  }

  /** Claim the next queued job (lowest sequence), transitioning it to running. */
  claimNext(): Option<Job> {
    const next = this.#queued().at(0);
    if (next === undefined) {
      return none();
    }
    const running: Job = { ...next, status: 'running', startedAt: this.#clock.now().toISOString() };
    this.#jobs.set(running.id, running);
    return some(running);
  }

  /** Mark a running job succeeded. */
  complete(jobId: string): Result<Job, JobNotFoundError | InvalidJobStateError> {
    return this.#finish(jobId, 'succeeded', ['running']);
  }

  /** Mark a running job failed with a reason. */
  fail(jobId: string, reason: string): Result<Job, JobNotFoundError | InvalidJobStateError> {
    return this.#finish(jobId, 'failed', ['running'], reason);
  }

  /** Cancel a queued or running job. */
  cancel(jobId: string): Result<Job, JobNotFoundError | InvalidJobStateError> {
    return this.#finish(jobId, 'canceled', ['queued', 'running']);
  }

  /** Cancel every queued job for a session (used when a session closes). */
  cancelQueuedForSession(sessionId: string): readonly Job[] {
    const canceled: Job[] = [];
    for (const job of this.#queued()) {
      if (job.sessionId === sessionId) {
        const result = this.#finish(job.id, 'canceled', ['queued']);
        if (result.ok) {
          canceled.push(result.value);
        }
      }
    }
    return canceled;
  }

  /** Get a job by id. */
  get(id: string): Option<Job> {
    return fromNullable(this.#jobs.get(id));
  }

  /** Every job, ordered by sequence then id. */
  list(): readonly Job[] {
    return [...this.#jobs.values()].sort(
      (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
    );
  }

  /** Non-terminal jobs (queued or running), ordered by sequence. */
  pending(): readonly Job[] {
    return this.list().filter((job) => !isTerminalJobStatus(job.status));
  }

  /** The current enqueue sequence counter. */
  get sequence(): number {
    return this.#sequence;
  }

  /** Serialize scheduler state. */
  snapshot(): { readonly jobs: readonly Job[]; readonly sequence: number } {
    return { jobs: this.list(), sequence: this.#sequence };
  }

  /**
   * Replace scheduler state from a snapshot. Any job left `running` (e.g. after
   * a crash) is reset to `queued` so it is safely re-run after recovery.
   */
  restore(jobs: readonly Job[], sequence: number): void {
    this.#jobs.clear();
    for (const job of jobs) {
      const recovered: Job = job.status === 'running' ? { ...job, status: 'queued' } : job;
      this.#jobs.set(recovered.id, recovered);
    }
    this.#sequence = sequence;
  }

  #queued(): readonly Job[] {
    return this.list().filter((job) => job.status === 'queued');
  }

  #finish(
    jobId: string,
    to: JobStatus,
    allowedFrom: readonly JobStatus[],
    failure?: string,
  ): Result<Job, JobNotFoundError | InvalidJobStateError> {
    const existing = this.#jobs.get(jobId);
    if (existing === undefined) {
      return err(new JobNotFoundError(jobId));
    }
    if (!allowedFrom.includes(existing.status)) {
      return err(new InvalidJobStateError(jobId, existing.status, to));
    }
    const updated: Job = {
      ...existing,
      status: to,
      finishedAt: this.#clock.now().toISOString(),
      ...(failure !== undefined ? { failure } : {}),
    };
    this.#jobs.set(jobId, updated);
    return ok(updated);
  }
}
