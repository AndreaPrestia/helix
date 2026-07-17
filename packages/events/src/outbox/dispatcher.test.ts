import type { DomainEvent } from '@helix/core';
import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from '../envelope.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import { OutboxDispatcher } from './dispatcher.js';

function envelope(id: string): EventEnvelope {
  const event: DomainEvent = {
    eventId: id,
    name: 'thing.happened',
    aggregateId: 'agg-1',
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: {},
  };
  return { sequence: 1, correlationId: id, causationId: id, event };
}

describe('InMemoryOutboxStore', () => {
  it('enqueues idempotently by event id', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue(envelope('e1'));
    await store.enqueue(envelope('e1'));
    expect(await store.list('pending')).toHaveLength(1);
  });
});

describe('OutboxDispatcher', () => {
  it('dispatches pending records and does not redeliver them', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue(envelope('e1'));
    const dispatcher = new OutboxDispatcher(store);
    let calls = 0;
    const handler = (): void => {
      calls += 1;
    };

    const first = await dispatcher.dispatchPending(handler);
    expect(first).toEqual({ dispatched: 1, retryable: 0, deadLettered: 0 });

    const second = await dispatcher.dispatchPending(handler);
    expect(second.dispatched).toBe(0);
    expect(calls).toBe(1);
    expect(await store.list('dispatched')).toHaveLength(1);
  });

  it('retries failed dispatches and dead-letters after the max attempts', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue(envelope('e1'));
    const dispatcher = new OutboxDispatcher(store, { maxAttempts: 3 });
    const failing = (): void => {
      throw new Error('downstream down');
    };

    expect((await dispatcher.dispatchPending(failing)).retryable).toBe(1);
    expect((await dispatcher.dispatchPending(failing)).retryable).toBe(1);
    const third = await dispatcher.dispatchPending(failing);
    expect(third.deadLettered).toBe(1);

    const deadLetters = await store.list('dead_letter');
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]?.attempts).toBe(3);
    expect(deadLetters[0]?.lastError).toBe('downstream down');
    // No further attempts once dead-lettered.
    expect((await dispatcher.dispatchPending(failing)).retryable).toBe(0);
  });

  it('replays dead letters back to pending for another attempt', async () => {
    const store = new InMemoryOutboxStore();
    await store.enqueue(envelope('e1'));
    const dispatcher = new OutboxDispatcher(store, { maxAttempts: 1 });

    await dispatcher.dispatchPending(() => {
      throw new Error('boom');
    });
    expect(await store.list('dead_letter')).toHaveLength(1);

    const replayed = await dispatcher.replayDeadLetters();
    expect(replayed).toBe(1);
    expect(await store.list('pending')).toHaveLength(1);

    const report = await dispatcher.dispatchPending(() => {
      /* succeeds */
    });
    expect(report.dispatched).toBe(1);
    expect(await store.list('dispatched')).toHaveLength(1);
  });
});
