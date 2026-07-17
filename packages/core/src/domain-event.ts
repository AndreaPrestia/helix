/**
 * A domain event records that something meaningful happened to an aggregate.
 * Events are immutable value records; their timestamps and identifiers are
 * supplied by ports (see `Clock` and `IdGenerator`) so behavior stays
 * deterministic under test.
 */
export interface DomainEvent<Name extends string = string, Payload = unknown> {
  /** Unique event identifier. */
  readonly eventId: string;
  /** Discriminating event name, e.g. `task.created`. */
  readonly name: Name;
  /** Identity of the aggregate the event belongs to. */
  readonly aggregateId: string;
  /** When the event occurred. */
  readonly occurredAt: Date;
  /** Immutable event payload. */
  readonly payload: Readonly<Payload>;
}
