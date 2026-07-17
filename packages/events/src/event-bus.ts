import { type DomainEvent, type Result, err, ok } from '@helix/core';
import type { EventEnvelope, PublishMetadata } from './envelope.js';
import { HandlerDispatchError, type HandlerFailure } from './errors.js';
import { InMemoryEventLog, type ReplayHandler } from './event-log.js';

/** A subscriber invoked for each dispatched envelope. May be sync or async. */
export type EventHandler = (envelope: EventEnvelope) => void | Promise<void>;

/** Subscription key matching every event. */
export const WILDCARD = '*';

/** Removes a previously registered subscription. */
export type Unsubscribe = () => void;

/**
 * A deterministic in-memory event bus (ADR-0016). It assigns each published
 * event a gap-free sequence, records it to an ordered log for replay, and
 * dispatches it to matching handlers — specific subscribers first, then
 * wildcard subscribers, each in subscription order. Sync and async handlers are
 * both awaited. Handler failures are reported explicitly (Article 7).
 */
export class InMemoryEventBus {
  readonly #handlers = new Map<string, EventHandler[]>();
  readonly #log = new InMemoryEventLog();
  #sequence = 0;

  /** Subscribe to a specific event name (or {@link WILDCARD} for all events). */
  subscribe(eventName: string, handler: EventHandler): Unsubscribe {
    const handlers = this.#handlers.get(eventName) ?? [];
    handlers.push(handler);
    this.#handlers.set(eventName, handlers);
    return () => {
      const current = this.#handlers.get(eventName);
      if (current === undefined) {
        return;
      }
      const index = current.indexOf(handler);
      if (index >= 0) {
        current.splice(index, 1);
      }
    };
  }

  /** Subscribe to every event regardless of name. */
  subscribeAll(handler: EventHandler): Unsubscribe {
    return this.subscribe(WILDCARD, handler);
  }

  /**
   * Publish an event: assign its sequence, record it, and dispatch it to all
   * matching handlers. Resolves to the recorded envelope, or to a
   * {@link HandlerDispatchError} if any handler failed.
   */
  async publish<E extends DomainEvent>(
    event: E,
    metadata: PublishMetadata = {},
  ): Promise<Result<EventEnvelope<E>, HandlerDispatchError>> {
    this.#sequence += 1;
    const envelope: EventEnvelope<E> = {
      sequence: this.#sequence,
      correlationId: metadata.correlationId ?? event.eventId,
      causationId: metadata.causationId ?? event.eventId,
      event,
    };
    this.#log.append(envelope);

    const failures = await this.#dispatch(envelope);
    return failures.length === 0 ? ok(envelope) : err(new HandlerDispatchError(failures));
  }

  /** An immutable, ordered view of every published envelope. */
  recorded(): readonly EventEnvelope[] {
    return this.#log.all();
  }

  /** Replay every recorded envelope in order to the handler. */
  replay(handler: ReplayHandler, afterSequence = 0): Promise<void> {
    return this.#log.replay(handler, afterSequence);
  }

  async #dispatch(envelope: EventEnvelope): Promise<HandlerFailure[]> {
    const specific = this.#handlers.get(envelope.event.name) ?? [];
    const wildcard = this.#handlers.get(WILDCARD) ?? [];
    const failures: HandlerFailure[] = [];
    for (const handler of [...specific, ...wildcard]) {
      try {
        await handler(envelope);
      } catch (error) {
        failures.push({ eventName: envelope.event.name, error });
      }
    }
    return failures;
  }
}
