/**
 * `@helix/events` — the in-memory event runtime.
 *
 * Provides the event envelope, correlation/causation metadata, an ordered
 * append-only log with deterministic replay, and a publish/subscribe bus with
 * sync/async handlers and wildcard subscriptions (ADR-0011, ADR-0016). It
 * depends only on the provider-agnostic `@helix/core` public API.
 */

export type { EventEnvelope, PublishMetadata } from './envelope.js';
export { HandlerDispatchError, type HandlerFailure } from './errors.js';
export { InMemoryEventLog, type ReplayHandler } from './event-log.js';
export { InMemoryEventBus, WILDCARD, type EventHandler, type Unsubscribe } from './event-bus.js';

export {
  type EventStore,
  type StoredEvent,
  type StreamWrite,
  STREAM_ID_PATTERN,
} from './store/event-store.js';
export {
  EventStoreError,
  ConcurrencyError,
  InvalidStreamIdError,
  StoreCorruptionError,
} from './store/store-errors.js';
export { InMemoryEventStore } from './store/in-memory-event-store.js';
export { JsonlEventStore } from './store/jsonl-event-store.js';

export {
  type AggregateSnapshot,
  type SnapshotStore,
  SnapshotStoreError,
} from './snapshot/snapshot-store.js';
export { type SnapshotPolicy, noSnapshotPolicy, shouldWriteSnapshot } from './snapshot/policy.js';
export { InMemorySnapshotStore } from './snapshot/in-memory-snapshot-store.js';
export {
  SnapshotRepository,
  type AggregateCodec,
  type LoadResult,
  type FallbackReason,
} from './snapshot/snapshot-repository.js';
