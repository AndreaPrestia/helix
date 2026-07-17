import { type Clock, type IdGenerator, type Option, type Result, err, ok } from '@helix/core';
import { DaemonNotAcceptingError, type DaemonError, SessionNotFoundError } from './errors.js';
import type { DaemonSnapshot, DaemonStatus, Job, WorkspaceSession } from './model.js';
import { JobScheduler } from './job-scheduler.js';
import { SessionManager } from './session-manager.js';
import type { DaemonStateStore } from './store.js';

/** Dependencies required to construct a {@link Daemon}. */
export interface DaemonDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly store: DaemonStateStore;
}

/**
 * The local daemon: coordinates workspace sessions and a job scheduler, and
 * persists all state write-through to a durable store so it survives restarts.
 * New work is accepted only while `running`; `shutdown` drains to a `stopped`
 * state, and {@link Daemon.recover} rebuilds a daemon from persisted state
 * (re-queuing any interrupted jobs). No hidden global state — everything is
 * injected (Constitution Articles 3 and 7).
 */
export class Daemon {
  readonly #store: DaemonStateStore;
  readonly #sessions: SessionManager;
  readonly #jobs: JobScheduler;
  #status: DaemonStatus = 'running';

  constructor(deps: DaemonDeps) {
    this.#store = deps.store;
    this.#sessions = new SessionManager(deps.clock, deps.ids);
    this.#jobs = new JobScheduler(deps.clock, deps.ids);
  }

  /** Rebuild a daemon from the store's persisted snapshot, if any. */
  static recover(deps: DaemonDeps): Daemon {
    const daemon = new Daemon(deps);
    const snapshot = deps.store.load();
    if (snapshot.some) {
      daemon.#sessions.restore(snapshot.value.sessions);
      daemon.#jobs.restore(snapshot.value.jobs, snapshot.value.sequence);
    }
    daemon.#status = 'running';
    return daemon;
  }

  /** Current lifecycle status. */
  status(): DaemonStatus {
    return this.#status;
  }

  /** Open a workspace session (only while running). */
  openSession(workspaceRoot: string): Result<WorkspaceSession, DaemonError> {
    if (this.#status !== 'running') {
      return err(new DaemonNotAcceptingError(this.#status));
    }
    const result = this.#sessions.open(workspaceRoot);
    if (result.ok) {
      this.#persist();
    }
    return result;
  }

  /** Close a session and cancel its queued jobs. */
  closeSession(sessionId: string): Result<WorkspaceSession, DaemonError> {
    const result = this.#sessions.close(sessionId);
    if (result.ok) {
      this.#jobs.cancelQueuedForSession(sessionId);
      this.#persist();
    }
    return result;
  }

  /** Enqueue a job against an active session (only while running). */
  enqueueJob(sessionId: string, kind: string): Result<Job, DaemonError> {
    if (this.#status !== 'running') {
      return err(new DaemonNotAcceptingError(this.#status));
    }
    const session = this.#sessions.get(sessionId);
    if (!session.some || session.value.status !== 'active') {
      return err(new SessionNotFoundError(sessionId));
    }
    const job = this.#jobs.enqueue(sessionId, kind);
    this.#persist();
    return ok(job);
  }

  /** Claim the next queued job for execution. */
  claimJob(): Option<Job> {
    const claimed = this.#jobs.claimNext();
    if (claimed.some) {
      this.#persist();
    }
    return claimed;
  }

  /** Mark a running job succeeded. */
  completeJob(jobId: string): Result<Job, DaemonError> {
    return this.#mutateJob(() => this.#jobs.complete(jobId));
  }

  /** Mark a running job failed. */
  failJob(jobId: string, reason: string): Result<Job, DaemonError> {
    return this.#mutateJob(() => this.#jobs.fail(jobId, reason));
  }

  /** Cancel a queued or running job. */
  cancelJob(jobId: string): Result<Job, DaemonError> {
    return this.#mutateJob(() => this.#jobs.cancel(jobId));
  }

  /** Get a session by id. */
  getSession(id: string): Option<WorkspaceSession> {
    return this.#sessions.get(id);
  }

  /** All sessions, id-sorted. */
  listSessions(): readonly WorkspaceSession[] {
    return this.#sessions.list();
  }

  /** Get a job by id. */
  getJob(id: string): Option<Job> {
    return this.#jobs.get(id);
  }

  /** All jobs, sequence-ordered. */
  listJobs(): readonly Job[] {
    return this.#jobs.list();
  }

  /**
   * Safely shut down: stop accepting new work (`draining`), persist final
   * state, and settle to `stopped`. Returns the persisted snapshot. Idempotent.
   */
  shutdown(): DaemonSnapshot {
    if (this.#status !== 'stopped') {
      this.#status = 'draining';
      const snapshot = this.snapshot();
      this.#store.save(snapshot);
      this.#status = 'stopped';
      return snapshot;
    }
    return this.snapshot();
  }

  /** A serializable snapshot of the daemon's current state. */
  snapshot(): DaemonSnapshot {
    const jobs = this.#jobs.snapshot();
    return {
      sessions: this.#sessions.snapshot(),
      jobs: jobs.jobs,
      sequence: jobs.sequence,
    };
  }

  #mutateJob(operation: () => Result<Job, DaemonError>): Result<Job, DaemonError> {
    const result = operation();
    if (result.ok) {
      this.#persist();
    }
    return result;
  }

  #persist(): void {
    this.#store.save(this.snapshot());
  }
}
