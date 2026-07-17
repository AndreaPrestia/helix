import type { EventEnvelope } from '../envelope.js';
import type { OutboxStore } from './outbox-store.js';

/** Retry configuration for outbox dispatch. */
export interface RetryPolicy {
  /** Maximum number of dispatch attempts before dead-lettering (>= 1). */
  readonly maxAttempts: number;
}

/** Default policy: three attempts before dead-letter. */
export const defaultRetryPolicy: RetryPolicy = { maxAttempts: 3 };

/** A downstream consumer of a dispatched envelope. May be sync or async. */
export type OutboxHandler = (envelope: EventEnvelope) => void | Promise<void>;

/** The explicit outcome of a dispatch run (Constitution Article 7). */
export interface DispatchReport {
  /** Records dispatched successfully in this run. */
  readonly dispatched: number;
  /** Records that failed but remain pending for a future retry. */
  readonly retryable: number;
  /** Records moved to the dead-letter status this run. */
  readonly deadLettered: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Dispatches pending outbox records to a handler with idempotency, a retry
 * policy, and dead-lettering. Already-dispatched records are never redelivered;
 * exhausted records become dead letters that can be replayed.
 */
export class OutboxDispatcher {
  readonly #store: OutboxStore;
  readonly #policy: RetryPolicy;

  constructor(store: OutboxStore, policy: RetryPolicy = defaultRetryPolicy) {
    this.#store = store;
    this.#policy = policy;
  }

  /** Attempt to dispatch every pending record once. */
  async dispatchPending(handler: OutboxHandler): Promise<DispatchReport> {
    let dispatched = 0;
    let retryable = 0;
    let deadLettered = 0;

    for (const record of await this.#store.list('pending')) {
      try {
        await handler(record.envelope);
        await this.#store.save({
          id: record.id,
          envelope: record.envelope,
          status: 'dispatched',
          attempts: record.attempts + 1,
        });
        dispatched += 1;
      } catch (error) {
        const attempts = record.attempts + 1;
        const lastError = errorMessage(error);
        if (attempts >= this.#policy.maxAttempts) {
          await this.#store.save({
            id: record.id,
            envelope: record.envelope,
            status: 'dead_letter',
            attempts,
            lastError,
          });
          deadLettered += 1;
        } else {
          await this.#store.save({
            id: record.id,
            envelope: record.envelope,
            status: 'pending',
            attempts,
            lastError,
          });
          retryable += 1;
        }
      }
    }

    return { dispatched, retryable, deadLettered };
  }

  /**
   * Replay tooling: reset every dead-letter record back to pending (attempts
   * cleared) so a subsequent dispatch run can retry it.
   */
  async replayDeadLetters(): Promise<number> {
    const deadLetters = await this.#store.list('dead_letter');
    for (const record of deadLetters) {
      await this.#store.save({
        id: record.id,
        envelope: record.envelope,
        status: 'pending',
        attempts: 0,
      });
    }
    return deadLetters.length;
  }
}
