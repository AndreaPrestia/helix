import type { DomainEvent } from './domain-event.js';
import { Entity } from './entity.js';

/**
 * Base class for aggregate roots. Aggregates protect their invariants, express
 * state transitions as behavior, and record {@link DomainEvent}s instead of
 * exposing mutable state (ADR-0015).
 */
export abstract class AggregateRoot<Id> extends Entity<Id> {
  #events: DomainEvent[] = [];

  /** Record a domain event raised by an aggregate behavior. */
  protected raise(event: DomainEvent): void {
    this.#events.push(event);
  }

  /** An immutable snapshot of the currently recorded events. */
  get domainEvents(): readonly DomainEvent[] {
    return [...this.#events];
  }

  /** Return and clear the recorded events (used when committing the aggregate). */
  pullDomainEvents(): readonly DomainEvent[] {
    const pulled = [...this.#events];
    this.#events = [];
    return pulled;
  }
}
