import { type DomainEvent, type Option, type Result, isErr, isOk, none, ok } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { InMemoryEventStore } from '../store/in-memory-event-store.js';
import type { StoredEvent } from '../store/event-store.js';
import { InMemorySnapshotStore } from './in-memory-snapshot-store.js';
import type { SnapshotPolicy } from './policy.js';
import {
  type AggregateSnapshot,
  type SnapshotStore,
  SnapshotStoreError,
} from './snapshot-store.js';
import { type AggregateCodec, SnapshotRepository } from './snapshot-repository.js';

interface CounterState {
  readonly total: number;
}

const codec: AggregateCodec<CounterState> = {
  schemaVersion: 1,
  initialState: () => ({ total: 0 }),
  apply: (state, stored: StoredEvent) => {
    const payload = stored.event.payload as { by?: number };
    return { total: state.total + (payload.by ?? 0) };
  },
  toSnapshotState: (state) => ({ total: state.total }),
  fromSnapshotState: (raw) => {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      typeof (raw as { total?: unknown }).total !== 'number'
    ) {
      throw new Error('corrupt snapshot state');
    }
    return { total: (raw as { total: number }).total };
  },
};

function incEvent(id: string, by: number): DomainEvent {
  return {
    eventId: id,
    name: 'counter.incremented',
    aggregateId: 'counter-1',
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: { by },
  };
}

async function seed(store: InMemoryEventStore, count: number): Promise<void> {
  for (let i = 1; i <= count; i += 1) {
    await store.appendToStream({
      streamId: 'counter-1',
      expectedVersion: i - 1,
      events: [incEvent(`e${i}`, 1)],
    });
  }
}

const cadence: SnapshotPolicy = { interval: 2, minVersion: 1, rebuildOnFallback: false };
const repairing: SnapshotPolicy = { interval: 0, minVersion: 1, rebuildOnFallback: true };

describe('SnapshotRepository load', () => {
  it('falls back to full replay when no snapshot exists', async () => {
    const events = new InMemoryEventStore();
    await seed(events, 3);
    const repo = new SnapshotRepository(events, new InMemorySnapshotStore(), cadence, codec);

    const result = await repo.load('counter-1');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.source).toBe('replay');
      expect(result.value.fallbackReason).toBe('missing');
      expect(result.value.state.total).toBe(3);
      expect(result.value.version).toBe(3);
      expect(result.value.snapshotWritten).toBe(true); // 3 - 0 >= interval 2
    }
  });

  it('restores from a snapshot and replays only later events', async () => {
    const events = new InMemoryEventStore();
    const snapshots = new InMemorySnapshotStore();
    await seed(events, 3);
    const repo = new SnapshotRepository(events, snapshots, cadence, codec);

    // First load writes a snapshot at version 3.
    await repo.load('counter-1');
    // Append two more events.
    await events.appendToStream({
      streamId: 'counter-1',
      expectedVersion: 3,
      events: [incEvent('e4', 1), incEvent('e5', 1)],
    });

    const result = await repo.load('counter-1');
    if (isOk(result)) {
      expect(result.value.source).toBe('snapshot');
      expect(result.value.fallbackReason).toBeUndefined();
      expect(result.value.state.total).toBe(5);
      expect(result.value.version).toBe(5);
    }
  });

  it('never writes a snapshot under a replay-only policy', async () => {
    const events = new InMemoryEventStore();
    await seed(events, 3);
    const repo = new SnapshotRepository(
      events,
      new InMemorySnapshotStore(),
      {
        interval: 0,
        minVersion: 0,
        rebuildOnFallback: false,
      },
      codec,
    );
    const result = await repo.load('counter-1');
    if (isOk(result)) {
      expect(result.value.snapshotWritten).toBe(false);
      expect(result.value.state.total).toBe(3);
    }
  });

  it('falls back and reports incompatible snapshots', async () => {
    const events = new InMemoryEventStore();
    const snapshots = new InMemorySnapshotStore();
    await seed(events, 3);
    await snapshots.save({
      aggregateId: 'counter-1',
      version: 2,
      schemaVersion: 999,
      state: { total: 99 },
    });
    const repo = new SnapshotRepository(events, snapshots, cadence, codec);

    const result = await repo.load('counter-1');
    if (isOk(result)) {
      expect(result.value.source).toBe('replay');
      expect(result.value.fallbackReason).toBe('incompatible');
      expect(result.value.state.total).toBe(3);
    }
  });

  it('falls back on corruption and repairs the snapshot when configured', async () => {
    const events = new InMemoryEventStore();
    const snapshots = new InMemorySnapshotStore();
    await seed(events, 3);
    await snapshots.save({
      aggregateId: 'counter-1',
      version: 2,
      schemaVersion: 1,
      state: { total: 'not-a-number' },
    });
    const repo = new SnapshotRepository(events, snapshots, repairing, codec);

    const result = await repo.load('counter-1');
    if (isOk(result)) {
      expect(result.value.fallbackReason).toBe('corrupt');
      expect(result.value.snapshotWritten).toBe(true);
      expect(result.value.state.total).toBe(3);
    }

    // The repaired snapshot is now usable.
    const reload = await repo.load('counter-1');
    if (isOk(reload)) {
      expect(reload.value.source).toBe('snapshot');
      expect(reload.value.state.total).toBe(3);
    }
  });

  it('propagates snapshot store write failures explicitly', async () => {
    const events = new InMemoryEventStore();
    await seed(events, 3);
    const failing: SnapshotStore = {
      load: async (): Promise<Result<Option<AggregateSnapshot>, SnapshotStoreError>> => ok(none()),
      save: async () => ({ ok: false, error: new SnapshotStoreError('disk full') }),
      delete: async () => ok(undefined),
    };
    const repo = new SnapshotRepository(events, failing, cadence, codec);

    const result = await repo.load('counter-1');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('SNAPSHOT_STORE_ERROR');
    }
  });
});

describe('SnapshotRepository rebuild', () => {
  it('rebuilds a snapshot from the full event stream', async () => {
    const events = new InMemoryEventStore();
    const snapshots = new InMemorySnapshotStore();
    await seed(events, 4);
    const repo = new SnapshotRepository(
      events,
      snapshots,
      {
        interval: 0,
        minVersion: 0,
        rebuildOnFallback: false,
      },
      codec,
    );

    const result = await repo.rebuild('counter-1');
    if (isOk(result)) {
      expect(result.value.source).toBe('replay');
      expect(result.value.version).toBe(4);
      expect(result.value.snapshotWritten).toBe(true);
    }

    const stored = await snapshots.load('counter-1');
    if (isOk(stored)) {
      expect(stored.value.some).toBe(true);
    }
  });
});
