import type { DomainEvent } from '@helix/core';

/**
 * An event envelope wraps an immutable {@link DomainEvent} with the metadata the
 * runtime needs: a monotonic global sequence and correlation/causation ids
 * linking related events across the platform (ADR-0011).
 */
export interface EventEnvelope<E extends DomainEvent = DomainEvent> {
  /** Monotonic, gap-free ordering assigned at publish time (starts at 1). */
  readonly sequence: number;
  /** Groups every event belonging to the same logical flow. */
  readonly correlationId: string;
  /** The id of the event (or command) that directly caused this one. */
  readonly causationId: string;
  /** The wrapped domain event. */
  readonly event: E;
}

/** Optional correlation/causation metadata supplied when publishing. */
export interface PublishMetadata {
  readonly correlationId?: string;
  readonly causationId?: string;
}
