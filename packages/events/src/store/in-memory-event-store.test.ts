import type { DomainEvent } from '@helix/core';
import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { InMemoryEventStore } from './in-memory-event-store.js';

function event(eventId: string, name = 'thing.happened', aggregateId = 'agg-1'): DomainEvent {
  return {
    eventId,
    name,
    aggregateId,
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: { eventId },
  };
}

describe('InMemoryEventStore', () => {
  it('appends to a new stream and assigns versions and sequences', async () => {
    const store = new InMemoryEventStore();
    const result = await store.appendToStream({
      streamId: 'agg-1',
      expectedVersion: 0,
      events: [event('e1'), event('e2')],
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.map((r) => r.version)).toEqual([1, 2]);
      expect(result.value.map((r) => r.sequence)).toEqual([1, 2]);
    }
  });

  it('reads a stream in version order', async () => {
    const store = new InMemoryEventStore();
    await store.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });
    await store.appendToStream({ streamId: 'agg-1', expectedVersion: 1, events: [event('e2')] });
    const read = await store.readStream('agg-1');
    if (isOk(read)) {
      expect(read.value.map((r) => r.event.eventId)).toEqual(['e1', 'e2']);
    }
  });

  it('rejects an append with a stale expected version', async () => {
    const store = new InMemoryEventStore();
    await store.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });
    const conflict = await store.appendToStream({
      streamId: 'agg-1',
      expectedVersion: 0,
      events: [event('e2')],
    });
    expect(isErr(conflict)).toBe(true);
    if (isErr(conflict)) {
      expect(conflict.error.code).toBe('CONCURRENCY_CONFLICT');
    }
  });

  it('appends atomically across streams, writing nothing on conflict', async () => {
    const store = new InMemoryEventStore();
    await store.appendToStream({ streamId: 'a', expectedVersion: 0, events: [event('a1')] });

    const result = await store.appendToStreams([
      { streamId: 'b', expectedVersion: 0, events: [event('b1')] },
      { streamId: 'a', expectedVersion: 0, events: [event('a2')] }, // stale -> whole batch fails
    ]);
    expect(isErr(result)).toBe(true);

    const streamB = await store.readStream('b');
    if (isOk(streamB)) {
      expect(streamB.value).toHaveLength(0);
    }
    const streamA = await store.readStream('a');
    if (isOk(streamA)) {
      expect(streamA.value).toHaveLength(1);
    }
  });

  it('reads all events in global sequence order', async () => {
    const store = new InMemoryEventStore();
    await store.appendToStream({ streamId: 'a', expectedVersion: 0, events: [event('a1')] });
    await store.appendToStream({ streamId: 'b', expectedVersion: 0, events: [event('b1')] });
    const all = await store.readAll();
    if (isOk(all)) {
      expect(all.value.map((r) => r.sequence)).toEqual([1, 2]);
      expect(all.value.map((r) => r.streamId)).toEqual(['a', 'b']);
    }
  });

  it('rejects an invalid stream id', async () => {
    const store = new InMemoryEventStore();
    const result = await store.appendToStream({
      streamId: '../escape',
      expectedVersion: 0,
      events: [event('e1')],
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_STREAM_ID');
    }
  });
});
