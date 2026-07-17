import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DomainEvent } from '@helix/core';
import { isErr, isOk } from '@helix/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonlEventStore } from './jsonl-event-store.js';

function event(eventId: string, name = 'thing.happened', aggregateId = 'agg-1'): DomainEvent {
  return {
    eventId,
    name,
    aggregateId,
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: { eventId },
  };
}

describe('JsonlEventStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'helix-jsonl-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists events durably across store instances', async () => {
    const writer = new JsonlEventStore(dir);
    await writer.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });

    const reader = new JsonlEventStore(dir);
    const read = await reader.readStream('agg-1');
    expect(isOk(read)).toBe(true);
    if (isOk(read)) {
      expect(read.value).toHaveLength(1);
      expect(read.value[0]?.event.eventId).toBe('e1');
      expect(read.value[0]?.event.occurredAt).toEqual(new Date('2026-07-17T00:00:00.000Z'));
      expect(read.value[0]?.version).toBe(1);
    }
  });

  it('enforces optimistic concurrency across instances', async () => {
    const first = new JsonlEventStore(dir);
    await first.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });

    const second = new JsonlEventStore(dir);
    const conflict = await second.appendToStream({
      streamId: 'agg-1',
      expectedVersion: 0,
      events: [event('e2')],
    });
    expect(isErr(conflict)).toBe(true);
    if (isErr(conflict)) {
      expect(conflict.error.code).toBe('CONCURRENCY_CONFLICT');
    }

    const ok2 = await second.appendToStream({
      streamId: 'agg-1',
      expectedVersion: 1,
      events: [event('e2')],
    });
    expect(isOk(ok2)).toBe(true);
  });

  it('appends atomically across streams, writing nothing on conflict', async () => {
    const store = new JsonlEventStore(dir);
    await store.appendToStream({ streamId: 'a', expectedVersion: 0, events: [event('a1')] });

    const result = await store.appendToStreams([
      { streamId: 'b', expectedVersion: 0, events: [event('b1')] },
      { streamId: 'a', expectedVersion: 0, events: [event('a2')] }, // stale
    ]);
    expect(isErr(result)).toBe(true);

    const streamB = await store.readStream('b');
    if (isOk(streamB)) {
      expect(streamB.value).toHaveLength(0);
    }
  });

  it('reads all events across streams in global sequence order', async () => {
    const store = new JsonlEventStore(dir);
    await store.appendToStream({ streamId: 'a', expectedVersion: 0, events: [event('a1')] });
    await store.appendToStream({ streamId: 'b', expectedVersion: 0, events: [event('b1')] });
    const all = await store.readAll();
    if (isOk(all)) {
      expect(all.value.map((r) => r.sequence)).toEqual([1, 2]);
      expect(all.value.map((r) => r.streamId)).toEqual(['a', 'b']);
    }
  });

  it('reports corruption explicitly for a malformed line', async () => {
    const store = new JsonlEventStore(dir);
    await store.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });
    await writeFile(join(dir, 'agg-1.jsonl'), 'not json\n', { flag: 'a' });

    const read = await store.readStream('agg-1');
    expect(isErr(read)).toBe(true);
    if (isErr(read)) {
      expect(read.error.code).toBe('STORE_CORRUPTION');
    }
  });

  it('returns an empty stream when nothing has been written', async () => {
    const store = new JsonlEventStore(dir);
    const read = await store.readStream('missing');
    expect(isOk(read)).toBe(true);
    if (isOk(read)) {
      expect(read.value).toHaveLength(0);
    }
  });

  it('rejects an invalid stream id', async () => {
    const store = new JsonlEventStore(dir);
    const read = await store.readStream('../escape');
    expect(isErr(read)).toBe(true);
    if (isErr(read)) {
      expect(read.error.code).toBe('INVALID_STREAM_ID');
    }
  });
});
