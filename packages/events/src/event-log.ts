import type { DomainEvent } from '@helix/core';
import type { EventEnvelope } from './envelope.js';

/** A consumer invoked for each replayed envelope, in order. */
export type ReplayHandler = (envelope: EventEnvelope) => void | Promise<void>;

/**
 * An append-only, in-order log of event envelopes supporting deterministic
 * ordered replay (ADR-0016). Durable stores will implement the same shape in
 * later releases.
 */
export class InMemoryEventLog {
  readonly #entries: EventEnvelope[] = [];

  /** Append an envelope to the end of the log. */
  append<E extends DomainEvent>(envelope: EventEnvelope<E>): void {
    this.#entries.push(envelope);
  }

  /** The number of recorded envelopes. */
  get length(): number {
    return this.#entries.length;
  }

  /** An immutable, ordered view of every recorded envelope. */
  all(): readonly EventEnvelope[] {
    return [...this.#entries];
  }

  /**
   * Replay recorded envelopes in sequence order to the handler. Optionally start
   * after a given sequence number (exclusive).
   */
  async replay(handler: ReplayHandler, afterSequence = 0): Promise<void> {
    for (const entry of this.#entries) {
      if (entry.sequence > afterSequence) {
        await handler(entry);
      }
    }
  }
}
