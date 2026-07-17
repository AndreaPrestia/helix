import type { DomainEvent } from '@helix/core';
import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from './envelope.js';
import { InMemoryEventBus, WILDCARD } from './event-bus.js';
import { isErr, isOk } from '@helix/core';

function makeEvent(name: string, eventId: string, aggregateId = 'agg-1'): DomainEvent {
  return {
    eventId,
    name,
    aggregateId,
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: {},
  };
}

describe('InMemoryEventBus envelope and metadata', () => {
  it('assigns a gap-free sequence and defaults correlation/causation to the event id', async () => {
    const bus = new InMemoryEventBus();
    const first = await bus.publish(makeEvent('a', 'evt_1'));
    const second = await bus.publish(makeEvent('b', 'evt_2'));
    expect(isOk(first) && isOk(second)).toBe(true);
    if (isOk(first) && isOk(second)) {
      expect(first.value.sequence).toBe(1);
      expect(second.value.sequence).toBe(2);
      expect(first.value.correlationId).toBe('evt_1');
      expect(first.value.causationId).toBe('evt_1');
    }
  });

  it('carries explicit correlation and causation metadata', async () => {
    const bus = new InMemoryEventBus();
    const root = await bus.publish(makeEvent('root', 'evt_1'));
    if (!isOk(root)) {
      throw new Error('setup failed');
    }
    const follow = await bus.publish(makeEvent('follow', 'evt_2'), {
      correlationId: root.value.correlationId,
      causationId: root.value.event.eventId,
    });
    if (isOk(follow)) {
      expect(follow.value.correlationId).toBe('evt_1');
      expect(follow.value.causationId).toBe('evt_1');
    }
  });
});

describe('InMemoryEventBus handlers', () => {
  it('invokes both sync and async handlers', async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];
    bus.subscribe('a', () => {
      calls.push('sync');
    });
    bus.subscribe('a', async (envelope: EventEnvelope) => {
      await Promise.resolve();
      calls.push(`async:${envelope.event.eventId}`);
    });
    await bus.publish(makeEvent('a', 'evt_1'));
    expect(calls).toEqual(['sync', 'async:evt_1']);
  });

  it('only delivers to matching subscriptions', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe('a', () => {
      received.push('a-handler');
    });
    bus.subscribe('b', () => {
      received.push('b-handler');
    });
    await bus.publish(makeEvent('a', 'evt_1'));
    expect(received).toEqual(['a-handler']);
  });

  it('delivers to wildcard subscribers after specific ones', async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];
    bus.subscribe('a', () => {
      order.push('specific');
    });
    bus.subscribeAll(() => {
      order.push('wildcard');
    });
    await bus.publish(makeEvent('a', 'evt_1'));
    await bus.publish(makeEvent('b', 'evt_2'));
    expect(order).toEqual(['specific', 'wildcard', 'wildcard']);
  });

  it('stops delivering after unsubscribe', async () => {
    const bus = new InMemoryEventBus();
    let count = 0;
    const unsubscribe = bus.subscribe('a', () => {
      count += 1;
    });
    await bus.publish(makeEvent('a', 'evt_1'));
    unsubscribe();
    await bus.publish(makeEvent('a', 'evt_2'));
    expect(count).toBe(1);
  });

  it('supports the WILDCARD constant explicitly', async () => {
    const bus = new InMemoryEventBus();
    const seen: string[] = [];
    bus.subscribe(WILDCARD, (envelope) => {
      seen.push(envelope.event.name);
    });
    await bus.publish(makeEvent('x', 'evt_1'));
    expect(seen).toEqual(['x']);
  });
});

describe('InMemoryEventBus explicit failure', () => {
  it('reports handler failures without hiding them, and still records the event', async () => {
    const bus = new InMemoryEventBus();
    let secondRan = false;
    bus.subscribe('a', () => {
      throw new Error('boom');
    });
    bus.subscribe('a', () => {
      secondRan = true;
    });
    const result = await bus.publish(makeEvent('a', 'evt_1'));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('HANDLER_DISPATCH_ERROR');
      expect(result.error.failures).toHaveLength(1);
    }
    expect(secondRan).toBe(true);
    expect(bus.recorded()).toHaveLength(1);
  });
});

describe('InMemoryEventBus ordered replay', () => {
  it('replays recorded envelopes in sequence order', async () => {
    const bus = new InMemoryEventBus();
    await bus.publish(makeEvent('a', 'evt_1'));
    await bus.publish(makeEvent('b', 'evt_2'));
    await bus.publish(makeEvent('c', 'evt_3'));
    const replayed: number[] = [];
    await bus.replay((envelope) => {
      replayed.push(envelope.sequence);
    });
    expect(replayed).toEqual([1, 2, 3]);
  });

  it('replays only envelopes after a given sequence', async () => {
    const bus = new InMemoryEventBus();
    await bus.publish(makeEvent('a', 'evt_1'));
    await bus.publish(makeEvent('b', 'evt_2'));
    const replayed: string[] = [];
    await bus.replay((envelope) => {
      replayed.push(envelope.event.name);
    }, 1);
    expect(replayed).toEqual(['b']);
  });
});
