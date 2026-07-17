import type { Clock, IdGenerator } from '@helix/core';

/** The outcome recorded for an audited action. */
export type AuditOutcome = 'allowed' | 'denied';

/** A request to append an entry to the audit trail. */
export interface AuditRequest {
  readonly actor: string;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly detail?: string;
}

/** An immutable, chained audit-trail entry. */
export interface AuditEntry {
  readonly id: string;
  /** Monotonic position in the trail, starting at 0. */
  readonly sequence: number;
  /** ISO-8601 instant the entry was recorded. */
  readonly at: string;
  readonly actor: string;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly detail?: string;
  /** The id of the preceding entry, chaining the trail for tamper-evidence. */
  readonly previousId?: string;
}

/**
 * An append-only, hash-chained audit trail of security-relevant actions.
 * Entries are immutable and ordered by a monotonic sequence; each links to its
 * predecessor so gaps or reordering are detectable. Timestamps and ids come
 * from injected ports, keeping the trail deterministic and testable
 * (Constitution Articles 3 and 9). There is no API to mutate or remove entries.
 */
export class AuditTrail {
  readonly #clock: Clock;
  readonly #ids: IdGenerator;
  readonly #entries: AuditEntry[] = [];

  constructor(clock: Clock, ids: IdGenerator) {
    this.#clock = clock;
    this.#ids = ids;
  }

  /** Append a new entry and return it. */
  record(request: AuditRequest): AuditEntry {
    const previous = this.#entries.at(-1);
    const entry: AuditEntry = {
      id: this.#ids.next(),
      sequence: this.#entries.length,
      at: this.#clock.now().toISOString(),
      actor: request.actor,
      action: request.action,
      outcome: request.outcome,
      ...(request.detail !== undefined ? { detail: request.detail } : {}),
      ...(previous !== undefined ? { previousId: previous.id } : {}),
    };
    this.#entries.push(entry);
    return entry;
  }

  /** Every entry, in recorded order. */
  entries(): readonly AuditEntry[] {
    return [...this.#entries];
  }

  /** Entries recorded at or after the given sequence. */
  since(sequence: number): readonly AuditEntry[] {
    return this.#entries.filter((entry) => entry.sequence >= sequence);
  }

  /** The number of recorded entries. */
  get size(): number {
    return this.#entries.length;
  }

  /**
   * Verify chain integrity: sequences are contiguous from 0 and each entry
   * links to the previous entry's id (the first entry has no predecessor).
   */
  verifyChain(): boolean {
    for (let index = 0; index < this.#entries.length; index += 1) {
      const entry = this.#entries[index];
      if (entry === undefined || entry.sequence !== index) {
        return false;
      }
      if (index === 0) {
        if (entry.previousId !== undefined) {
          return false;
        }
      } else if (entry.previousId !== this.#entries[index - 1]?.id) {
        return false;
      }
    }
    return true;
  }
}
