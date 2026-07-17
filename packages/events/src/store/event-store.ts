import type { DomainEvent, Result } from '@helix/core';
import type { EventStoreError } from './store-errors.js';

/** A persisted event with its global sequence and per-stream version. */
export interface StoredEvent<E extends DomainEvent = DomainEvent> {
  /** Global, gap-free ordering across all streams (1-based). */
  readonly sequence: number;
  /** The stream (aggregate) the event belongs to. */
  readonly streamId: string;
  /** Per-stream version (1-based). */
  readonly version: number;
  /** The persisted domain event. */
  readonly event: E;
}

/** A single stream append request guarded by an expected version. */
export interface StreamWrite {
  /** Target stream identifier. */
  readonly streamId: string;
  /** Version the caller expects the stream to be at (0 for a new stream). */
  readonly expectedVersion: number;
  /** The events to append, in order. */
  readonly events: readonly DomainEvent[];
}

/**
 * A durable event store (ADR-0017). Appends are guarded by optimistic
 * concurrency (ADR-0018) and multi-stream appends are atomic (ADR-0019): if any
 * stream's expected version does not match, nothing is written.
 */
export interface EventStore {
  /** Append to a single stream. */
  appendToStream(write: StreamWrite): Promise<Result<readonly StoredEvent[], EventStoreError>>;
  /** Atomically append to several streams (all-or-nothing). */
  appendToStreams(
    writes: readonly StreamWrite[],
  ): Promise<Result<readonly StoredEvent[], EventStoreError>>;
  /** Read one stream in version order. */
  readStream(streamId: string): Promise<Result<readonly StoredEvent[], EventStoreError>>;
  /** Read every stored event in global sequence order. */
  readAll(): Promise<Result<readonly StoredEvent[], EventStoreError>>;
}

/** Stream ids must be safe, path-free tokens. */
export const STREAM_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
