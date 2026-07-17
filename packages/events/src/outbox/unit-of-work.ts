import { type Result, ok } from '@helix/core';
import type { EventEnvelope } from '../envelope.js';
import type { EventStore, StoredEvent, StreamWrite } from '../store/event-store.js';
import type { EventStoreError } from '../store/store-errors.js';
import type { SnapshotStoreError } from '../snapshot/snapshot-store.js';
import type { OutboxRecord, OutboxStore } from './outbox-store.js';

/** A post-commit snapshot materialization that may fail without rolling back. */
export type SnapshotMaterializer = () => Promise<Result<void, SnapshotStoreError>>;

/** A post-commit failure that does not invalidate the committed events. */
export interface SnapshotFailure {
  readonly error: SnapshotStoreError;
}

/** Options for a unit-of-work commit. */
export interface CommitOptions {
  /** Optional post-commit snapshot materialization (ADR-0026). */
  readonly materializeSnapshot?: SnapshotMaterializer;
}

/**
 * The structured outcome of a commit (ADR-0027). A successful event append is
 * never reported as failed merely because a derived snapshot failed; snapshot
 * failures are surfaced explicitly for retry/repair.
 */
export interface CommitResult {
  readonly committed: readonly StoredEvent[];
  readonly outbox: readonly OutboxRecord[];
  readonly snapshotFailures: readonly SnapshotFailure[];
}

function toEnvelope(stored: StoredEvent): EventEnvelope {
  return {
    sequence: stored.sequence,
    correlationId: stored.event.eventId,
    causationId: stored.event.eventId,
    event: stored.event,
  };
}

/**
 * Coordinates a transactional commit (ADR-0019): it atomically appends tracked
 * streams, and only after a successful append writes post-commit outbox records
 * and (optionally) materializes a snapshot. If the append fails, nothing is
 * committed and no outbox records are written.
 */
export class UnitOfWork {
  readonly #events: EventStore;
  readonly #outbox: OutboxStore;

  constructor(events: EventStore, outbox: OutboxStore) {
    this.#events = events;
    this.#outbox = outbox;
  }

  async commit(
    writes: readonly StreamWrite[],
    options: CommitOptions = {},
  ): Promise<Result<CommitResult, EventStoreError>> {
    const appended = await this.#events.appendToStreams(writes);
    if (!appended.ok) {
      return appended;
    }

    const outbox: OutboxRecord[] = [];
    for (const stored of appended.value) {
      outbox.push(await this.#outbox.enqueue(toEnvelope(stored)));
    }

    const snapshotFailures: SnapshotFailure[] = [];
    if (options.materializeSnapshot !== undefined) {
      const materialized = await options.materializeSnapshot();
      if (!materialized.ok) {
        snapshotFailures.push({ error: materialized.error });
      }
    }

    return ok({ committed: appended.value, outbox, snapshotFailures });
  }
}
