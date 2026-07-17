import { type Option, type Result, DomainError } from '@helix/core';

/**
 * A persisted aggregate snapshot. Snapshots are optional optimizations, never
 * the source of truth: they are independently versioned, disposable, and always
 * rebuildable from the event stream (ADR-0022).
 */
export interface AggregateSnapshot {
  /** The aggregate (stream) the snapshot belongs to. */
  readonly aggregateId: string;
  /** The aggregate version captured by this snapshot. */
  readonly version: number;
  /** Schema version used to detect incompatible snapshots. */
  readonly schemaVersion: number;
  /** The serialized aggregate state. */
  readonly state: unknown;
}

/** Failure while reading or writing a snapshot. */
export class SnapshotStoreError extends DomainError {
  readonly code = 'SNAPSHOT_STORE_ERROR';
}

/**
 * A store for aggregate snapshots. Because snapshots are optional, a missing
 * snapshot is represented as an absent {@link Option}, not an error.
 */
export interface SnapshotStore {
  save(snapshot: AggregateSnapshot): Promise<Result<void, SnapshotStoreError>>;
  load(aggregateId: string): Promise<Result<Option<AggregateSnapshot>, SnapshotStoreError>>;
  delete(aggregateId: string): Promise<Result<void, SnapshotStoreError>>;
}
