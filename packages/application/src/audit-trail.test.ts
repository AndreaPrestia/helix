import type { Clock, IdGenerator } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { AuditTrail } from './audit-trail.js';

function fakeClock(): Clock {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) };
}

function seqIds(prefix = 'a'): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

describe('AuditTrail', () => {
  it('appends immutable, sequenced entries', () => {
    const trail = new AuditTrail(fakeClock(), seqIds());
    const first = trail.record({ actor: 'agent', action: 'tool.invoke', outcome: 'allowed' });
    const second = trail.record({
      actor: 'agent',
      action: 'tool.invoke',
      outcome: 'denied',
      detail: 'net.fetch',
    });
    expect(first.sequence).toBe(0);
    expect(first.previousId).toBeUndefined();
    expect(second.sequence).toBe(1);
    expect(second.previousId).toBe(first.id);
    expect(second.detail).toBe('net.fetch');
    expect(trail.size).toBe(2);
  });

  it('returns entries in recorded order and supports since()', () => {
    const trail = new AuditTrail(fakeClock(), seqIds());
    trail.record({ actor: 'a', action: 'x', outcome: 'allowed' });
    trail.record({ actor: 'a', action: 'y', outcome: 'allowed' });
    trail.record({ actor: 'a', action: 'z', outcome: 'allowed' });
    expect(trail.entries().map((e) => e.action)).toEqual(['x', 'y', 'z']);
    expect(trail.since(1).map((e) => e.action)).toEqual(['y', 'z']);
  });

  it('verifies chain integrity of a well-formed trail', () => {
    const trail = new AuditTrail(fakeClock(), seqIds());
    trail.record({ actor: 'a', action: 'x', outcome: 'allowed' });
    trail.record({ actor: 'a', action: 'y', outcome: 'denied' });
    expect(trail.verifyChain()).toBe(true);
  });

  it('exposes only a copy of its entries (append-only)', () => {
    const trail = new AuditTrail(fakeClock(), seqIds());
    trail.record({ actor: 'a', action: 'x', outcome: 'allowed' });
    const snapshot = trail.entries() as { length: number };
    // Mutating the returned array must not affect the trail.
    (snapshot as unknown[]).push({});
    expect(trail.size).toBe(1);
  });
});
