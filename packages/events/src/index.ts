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
