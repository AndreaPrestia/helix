import { type Option, type Result, fromNullable, ok } from '@helix/core';
import {
  type AggregateSnapshot,
  type SnapshotStore,
  type SnapshotStoreError,
} from './snapshot-store.js';

/** A deterministic in-memory {@link SnapshotStore} reference implementation. */
export class InMemorySnapshotStore implements SnapshotStore {
  readonly #snapshots = new Map<string, AggregateSnapshot>();

  async save(snapshot: AggregateSnapshot): Promise<Result<void, SnapshotStoreError>> {
    this.#snapshots.set(snapshot.aggregateId, snapshot);
    return ok(undefined);
  }

  async load(aggregateId: string): Promise<Result<Option<AggregateSnapshot>, SnapshotStoreError>> {
    return ok(fromNullable(this.#snapshots.get(aggregateId)));
  }

  async delete(aggregateId: string): Promise<Result<void, SnapshotStoreError>> {
    this.#snapshots.delete(aggregateId);
    return ok(undefined);
  }
}
