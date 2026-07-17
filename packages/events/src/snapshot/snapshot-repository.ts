import { type Result, isNone, ok } from '@helix/core';
import type { EventStore, StoredEvent } from '../store/event-store.js';
import type { EventStoreError } from '../store/store-errors.js';
import { type SnapshotPolicy, shouldWriteSnapshot } from './policy.js';
import { type SnapshotStore, type SnapshotStoreError } from './snapshot-store.js';

/** Why a snapshot could not be used and full replay was required. */
export type FallbackReason = 'missing' | 'corrupt' | 'incompatible';

/**
 * Converts between an aggregate's in-memory state and its persisted forms.
 * Domain aggregates own this conversion (ADR-0023); the runtime stays generic.
 */
export interface AggregateCodec<State> {
  /** Schema version used to detect incompatible snapshots. */
  readonly schemaVersion: number;
  /** The state of a brand-new aggregate before any events. */
  initialState(): State;
  /** Fold a stored event onto the state. */
  apply(state: State, event: StoredEvent): State;
  /** Capture immutable snapshot state. */
  toSnapshotState(state: State): unknown;
  /** Restore state from snapshot state. MAY throw on corrupt input. */
  fromSnapshotState(state: unknown): State;
}

/** The observable outcome of loading an aggregate. */
export interface LoadResult<State> {
  readonly state: State;
  readonly version: number;
  /** Whether a snapshot was used as the starting point. */
  readonly source: 'snapshot' | 'replay';
  /** Present when a snapshot existed but could not be used. */
  readonly fallbackReason?: FallbackReason;
  /** Whether a snapshot was (re)written during this load. */
  readonly snapshotWritten: boolean;
}

type LoadError = EventStoreError | SnapshotStoreError;

/**
 * A snapshot-aware aggregate repository (ADR-0023). It restores from a
 * compatible snapshot and replays only subsequent events; when a snapshot is
 * missing, corrupt, or incompatible it falls back to full replay and the reason
 * is observable in the result (ADR-0024). The event stream is always
 * authoritative (ADR-0022).
 */
export class SnapshotRepository<State> {
  readonly #events: EventStore;
  readonly #snapshots: SnapshotStore;
  readonly #policy: SnapshotPolicy;
  readonly #codec: AggregateCodec<State>;

  constructor(
    events: EventStore,
    snapshots: SnapshotStore,
    policy: SnapshotPolicy,
    codec: AggregateCodec<State>,
  ) {
    this.#events = events;
    this.#snapshots = snapshots;
    this.#policy = policy;
    this.#codec = codec;
  }

  /** Load an aggregate, using a snapshot when possible and replaying the rest. */
  async load(streamId: string): Promise<Result<LoadResult<State>, LoadError>> {
    let state = this.#codec.initialState();
    let version = 0;
    let usedSnapshot = false;
    let fallbackReason: FallbackReason | undefined;

    const snapshot = await this.#snapshots.load(streamId);
    if (!snapshot.ok) {
      fallbackReason = 'corrupt';
    } else if (isNone(snapshot.value)) {
      fallbackReason = 'missing';
    } else if (snapshot.value.value.schemaVersion !== this.#codec.schemaVersion) {
      fallbackReason = 'incompatible';
    } else {
      try {
        state = this.#codec.fromSnapshotState(snapshot.value.value.state);
        version = snapshot.value.value.version;
        usedSnapshot = true;
      } catch {
        state = this.#codec.initialState();
        version = 0;
        fallbackReason = 'corrupt';
      }
    }

    const replayed = await this.#applyEventsAfter(streamId, state, version);
    if (!replayed.ok) {
      return replayed;
    }
    state = replayed.value.state;
    const snapshotVersionBefore = usedSnapshot ? version : 0;
    version = replayed.value.version;

    const cadence = shouldWriteSnapshot(this.#policy, version, snapshotVersionBefore);
    const repair =
      this.#policy.rebuildOnFallback &&
      (fallbackReason === 'corrupt' || fallbackReason === 'incompatible') &&
      version >= this.#policy.minVersion;

    let snapshotWritten = false;
    if (cadence || repair) {
      const saved = await this.#writeSnapshot(streamId, state, version);
      if (!saved.ok) {
        return saved;
      }
      snapshotWritten = true;
    }

    const base: LoadResult<State> = {
      state,
      version,
      source: usedSnapshot ? 'snapshot' : 'replay',
      snapshotWritten,
    };
    return ok(fallbackReason === undefined ? base : { ...base, fallbackReason });
  }

  /**
   * Repair a snapshot by replaying the full stream and writing a fresh snapshot,
   * regardless of cadence. Never changes domain history (ADR-0024).
   */
  async rebuild(streamId: string): Promise<Result<LoadResult<State>, LoadError>> {
    const replayed = await this.#applyEventsAfter(streamId, this.#codec.initialState(), 0);
    if (!replayed.ok) {
      return replayed;
    }
    const { state, version } = replayed.value;

    let snapshotWritten = false;
    if (version >= 1) {
      const saved = await this.#writeSnapshot(streamId, state, version);
      if (!saved.ok) {
        return saved;
      }
      snapshotWritten = true;
    }
    return ok({ state, version, source: 'replay', snapshotWritten });
  }

  async #applyEventsAfter(
    streamId: string,
    initial: State,
    fromVersion: number,
  ): Promise<Result<{ state: State; version: number }, LoadError>> {
    const events = await this.#events.readStream(streamId);
    if (!events.ok) {
      return events;
    }
    let state = initial;
    let version = fromVersion;
    for (const stored of events.value) {
      if (stored.version > version) {
        state = this.#codec.apply(state, stored);
        version = stored.version;
      }
    }
    return ok({ state, version });
  }

  async #writeSnapshot(
    streamId: string,
    state: State,
    version: number,
  ): Promise<Result<void, SnapshotStoreError>> {
    return this.#snapshots.save({
      aggregateId: streamId,
      version,
      schemaVersion: this.#codec.schemaVersion,
      state: this.#codec.toSnapshotState(state),
    });
  }
}
