import type { DomainEvent } from '@helix/core';
import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from './envelope.js';
import { InMemoryEventLog } from './event-log.js';

function envelope(sequence: number, name: string): EventEnvelope {
  const event: DomainEvent = {
    eventId: `evt_${sequence}`,
    name,
    aggregateId: 'agg-1',
    occurredAt: new Date('2026-07-17T00:00:00.000Z'),
    payload: {},
  };
  return { sequence, correlationId: event.eventId, causationId: event.eventId, event };
}

describe('InMemoryEventLog', () => {
  it('appends and exposes an ordered, immutable view', () => {
    const log = new InMemoryEventLog();
    log.append(envelope(1, 'a'));
    log.append(envelope(2, 'b'));
    expect(log.length).toBe(2);
    const all = log.all();
    expect(all.map((entry) => entry.sequence)).toEqual([1, 2]);
    // Returned array is a copy; mutating it does not affect the log.
    (all as EventEnvelope[]).pop();
    expect(log.length).toBe(2);
  });

  it('replays in order', async () => {
    const log = new InMemoryEventLog();
    log.append(envelope(1, 'a'));
    log.append(envelope(2, 'b'));
    const seen: number[] = [];
    await log.replay((entry) => {
      seen.push(entry.sequence);
    });
    expect(seen).toEqual([1, 2]);
  });

  it('supports async replay handlers', async () => {
    const log = new InMemoryEventLog();
    log.append(envelope(1, 'a'));
    const seen: string[] = [];
    await log.replay(async (entry) => {
      await Promise.resolve();
      seen.push(entry.event.name);
    });
    expect(seen).toEqual(['a']);
  });
});
