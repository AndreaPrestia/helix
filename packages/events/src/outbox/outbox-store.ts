import type { EventEnvelope } from '../envelope.js';

/** Lifecycle status of an outbox record. */
export type OutboxStatus = 'pending' | 'dispatched' | 'dead_letter';

/**
 * A durable record of a committed event awaiting dispatch. Records are created
 * only after the event append has committed (ADR-0019), keyed by the event id
 * for idempotency.
 */
export interface OutboxRecord {
  /** Idempotency key (the committed event's id). */
  readonly id: string;
  /** The committed event envelope to dispatch. */
  readonly envelope: EventEnvelope;
  /** Current dispatch status. */
  readonly status: OutboxStatus;
  /** Number of dispatch attempts made so far. */
  readonly attempts: number;
  /** The last failure message, when a dispatch attempt failed. */
  readonly lastError?: string;
}

/**
 * Storage for outbox records. Durable adapters implement the same contract; the
 * in-memory implementation is the reference.
 */
export interface OutboxStore {
  /** Enqueue an envelope. Idempotent by event id: an existing record is returned unchanged. */
  enqueue(envelope: EventEnvelope): Promise<OutboxRecord>;
  /** List records with the given status, in insertion order. */
  list(status: OutboxStatus): Promise<readonly OutboxRecord[]>;
  /** Upsert a record by id. */
  save(record: OutboxRecord): Promise<void>;
}
