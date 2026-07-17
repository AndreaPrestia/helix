import { describe, expect, it } from 'vitest';
import { AggregateRoot } from './aggregate-root.js';
import type { Clock } from './ports/clock.js';
import type { DomainEvent } from './domain-event.js';
import type { IdGenerator } from './ports/id-generator.js';

/** Deterministic clock returning a fixed instant. */
class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}
  now(): Date {
    return this.instant;
  }
}

/** Deterministic id generator returning a predictable sequence. */
class SequentialIdGenerator implements IdGenerator {
  #counter = 0;
  next(): string {
    this.#counter += 1;
    return `evt_${this.#counter}`;
  }
}

interface OpenedPayload {
  readonly label: string;
}

class Box extends AggregateRoot<string> {
  private constructor(id: string) {
    super(id);
  }

  static open(id: string, label: string, clock: Clock, ids: IdGenerator): Box {
    const box = new Box(id);
    const event: DomainEvent<'box.opened', OpenedPayload> = {
      eventId: ids.next(),
      name: 'box.opened',
      aggregateId: id,
      occurredAt: clock.now(),
      payload: { label },
    };
    box.raise(event);
    return box;
  }
}

describe('AggregateRoot with Clock and IdGenerator ports', () => {
  const instant = new Date('2026-07-17T00:00:00.000Z');

  it('records domain events deterministically from injected ports', () => {
    const box = Box.open('box-1', 'first', new FixedClock(instant), new SequentialIdGenerator());
    const events = box.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0]?.eventId).toBe('evt_1');
    expect(events[0]?.name).toBe('box.opened');
    expect(events[0]?.aggregateId).toBe('box-1');
    expect(events[0]?.occurredAt).toEqual(instant);
    expect(events[0]?.payload).toEqual({ label: 'first' });
  });

  it('produces identical events for identical inputs (determinism)', () => {
    const a = Box.open('box-1', 'x', new FixedClock(instant), new SequentialIdGenerator());
    const b = Box.open('box-1', 'x', new FixedClock(instant), new SequentialIdGenerator());
    expect(a.domainEvents).toEqual(b.domainEvents);
  });

  it('pulls and clears recorded events', () => {
    const box = Box.open('box-1', 'x', new FixedClock(instant), new SequentialIdGenerator());
    const pulled = box.pullDomainEvents();
    expect(pulled).toHaveLength(1);
    expect(box.domainEvents).toHaveLength(0);
  });
});
