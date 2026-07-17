import { type Option, fromNullable } from '@helix/core';
import type { DaemonSnapshot } from './model.js';

/**
 * Durable store for the daemon's state. Persists a full {@link DaemonSnapshot}
 * (write-through) so the daemon survives restarts. All I/O is behind this port,
 * keeping the daemon logic deterministic and testable.
 */
export interface DaemonStateStore {
  /** Persist the latest snapshot, replacing any prior state. */
  save(snapshot: DaemonSnapshot): void;
  /** Load the most recently persisted snapshot, if any. */
  load(): Option<DaemonSnapshot>;
}

/** An in-memory {@link DaemonStateStore} holding the last saved snapshot. */
export class InMemoryDaemonStateStore implements DaemonStateStore {
  #snapshot: DaemonSnapshot | undefined;

  save(snapshot: DaemonSnapshot): void {
    this.#snapshot = snapshot;
  }

  load(): Option<DaemonSnapshot> {
    return fromNullable(this.#snapshot);
  }
}
