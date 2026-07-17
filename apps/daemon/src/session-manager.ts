import {
  type Clock,
  type IdGenerator,
  type Option,
  type Result,
  err,
  fromNullable,
  none,
  ok,
} from '@helix/core';
import { DuplicateSessionError, SessionNotFoundError } from './errors.js';
import type { WorkspaceSession } from './model.js';

/**
 * Tracks workspace sessions. At most one session may be active per workspace
 * root at a time. Identifiers and timestamps come from injected ports, keeping
 * behaviour deterministic; listings are id-sorted.
 */
export class SessionManager {
  readonly #clock: Clock;
  readonly #ids: IdGenerator;
  readonly #sessions = new Map<string, WorkspaceSession>();

  constructor(clock: Clock, ids: IdGenerator) {
    this.#clock = clock;
    this.#ids = ids;
  }

  /** Open a session for a workspace root. Fails if one is already active for it. */
  open(workspaceRoot: string): Result<WorkspaceSession, DuplicateSessionError> {
    if (this.activeFor(workspaceRoot).some) {
      return err(new DuplicateSessionError(workspaceRoot));
    }
    const session: WorkspaceSession = {
      id: this.#ids.next(),
      workspaceRoot,
      status: 'active',
      openedAt: this.#clock.now().toISOString(),
    };
    this.#sessions.set(session.id, session);
    return ok(session);
  }

  /** Close an active session. Idempotent for an already-closed session. */
  close(id: string): Result<WorkspaceSession, SessionNotFoundError> {
    const existing = this.#sessions.get(id);
    if (existing === undefined) {
      return err(new SessionNotFoundError(id));
    }
    if (existing.status === 'closed') {
      return ok(existing);
    }
    const closed: WorkspaceSession = {
      ...existing,
      status: 'closed',
      closedAt: this.#clock.now().toISOString(),
    };
    this.#sessions.set(id, closed);
    return ok(closed);
  }

  /** Get a session by id. */
  get(id: string): Option<WorkspaceSession> {
    return fromNullable(this.#sessions.get(id));
  }

  /** The active session for a workspace root, if any. */
  activeFor(workspaceRoot: string): Option<WorkspaceSession> {
    for (const session of this.#sessions.values()) {
      if (session.workspaceRoot === workspaceRoot && session.status === 'active') {
        return fromNullable(session);
      }
    }
    return none();
  }

  /** Every session, sorted by id. */
  list(): readonly WorkspaceSession[] {
    return [...this.#sessions.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Serialize the session state. */
  snapshot(): readonly WorkspaceSession[] {
    return this.list();
  }

  /** Replace the session state from a snapshot. */
  restore(sessions: readonly WorkspaceSession[]): void {
    this.#sessions.clear();
    for (const session of sessions) {
      this.#sessions.set(session.id, session);
    }
  }
}
