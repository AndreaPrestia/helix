import { type DomainEvent, type Result, err, isErr, isOk, ok } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { InMemoryEventStore } from '../store/in-memory-event-store.js';
import { SnapshotStoreError } from '../snapshot/snapshot-store.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import { UnitOfWork } from './unit-of-work.js';

function event(id: string): DomainEvent {
  return {
    eventId: id,
    name: 'thing.happened',
    aggregateId: 'agg-1',
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: {},
  };
}

describe('UnitOfWork commit', () => {
  it('appends events and writes post-commit outbox records', async () => {
    const events = new InMemoryEventStore();
    const outbox = new InMemoryOutboxStore();
    const uow = new UnitOfWork(events, outbox);

    const result = await uow.commit([
      { streamId: 'agg-1', expectedVersion: 0, events: [event('e1'), event('e2')] },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.committed).toHaveLength(2);
      expect(result.value.outbox).toHaveLength(2);
      expect(result.value.snapshotFailures).toHaveLength(0);
    }
    expect(await outbox.list('pending')).toHaveLength(2);
    const stored = await events.readStream('agg-1');
    if (isOk(stored)) {
      expect(stored.value).toHaveLength(2);
    }
  });

  it('writes nothing to the outbox when the append fails', async () => {
    const events = new InMemoryEventStore();
    const outbox = new InMemoryOutboxStore();
    await events.appendToStream({ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] });
    const uow = new UnitOfWork(events, outbox);

    const result = await uow.commit([
      { streamId: 'agg-1', expectedVersion: 0, events: [event('e2')] }, // stale version
    ]);

    expect(isErr(result)).toBe(true);
    expect(await outbox.list('pending')).toHaveLength(0);
  });

  it('reports post-commit snapshot failures without failing the commit', async () => {
    const events = new InMemoryEventStore();
    const outbox = new InMemoryOutboxStore();
    const uow = new UnitOfWork(events, outbox);

    const result = await uow.commit(
      [{ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] }],
      {
        materializeSnapshot: async (): Promise<Result<void, SnapshotStoreError>> =>
          err(new SnapshotStoreError('snapshot write failed')),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.committed).toHaveLength(1);
      expect(result.value.snapshotFailures).toHaveLength(1);
      expect(result.value.snapshotFailures[0]?.error.code).toBe('SNAPSHOT_STORE_ERROR');
    }
  });

  it('records a successful post-commit snapshot with no failures', async () => {
    const events = new InMemoryEventStore();
    const outbox = new InMemoryOutboxStore();
    const uow = new UnitOfWork(events, outbox);

    const result = await uow.commit(
      [{ streamId: 'agg-1', expectedVersion: 0, events: [event('e1')] }],
      {
        materializeSnapshot: async (): Promise<Result<void, SnapshotStoreError>> => ok(undefined),
      },
    );

    if (isOk(result)) {
      expect(result.value.snapshotFailures).toHaveLength(0);
    }
  });
});
