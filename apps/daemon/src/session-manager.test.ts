import type { Clock, IdGenerator } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { SessionManager } from './session-manager.js';

function fakeClock(): Clock {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) };
}

function seqIds(prefix = 's'): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

describe('SessionManager', () => {
  it('opens a session for a workspace', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    const result = manager.open('/repo/a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ id: 's-1', workspaceRoot: '/repo/a', status: 'active' });
      expect(result.value.openedAt).toMatch(/^2026-01-01T/);
    }
  });

  it('rejects a duplicate active session for the same workspace', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    manager.open('/repo/a');
    const result = manager.open('/repo/a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DUPLICATE_SESSION');
    }
  });

  it('allows a new session after the previous is closed', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    const first = manager.open('/repo/a');
    if (first.ok) {
      manager.close(first.value.id);
    }
    expect(manager.open('/repo/a').ok).toBe(true);
  });

  it('closes a session and records closedAt', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    const opened = manager.open('/repo/a');
    if (!opened.ok) throw new Error('expected open');
    const closed = manager.close(opened.value.id);
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.value.status).toBe('closed');
      expect(closed.value.closedAt).toBeDefined();
    }
  });

  it('is idempotent when closing an already-closed session', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    const opened = manager.open('/repo/a');
    if (!opened.ok) throw new Error('expected open');
    manager.close(opened.value.id);
    expect(manager.close(opened.value.id).ok).toBe(true);
  });

  it('errors when closing an unknown session', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    const result = manager.close('missing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SESSION_NOT_FOUND');
    }
  });

  it('lists sessions id-sorted and round-trips a snapshot', () => {
    const manager = new SessionManager(fakeClock(), seqIds());
    manager.open('/repo/b');
    manager.open('/repo/a');
    expect(manager.list().map((s) => s.id)).toEqual(['s-1', 's-2']);

    const snapshot = manager.snapshot();
    const restored = new SessionManager(fakeClock(), seqIds());
    restored.restore(snapshot);
    expect(restored.list()).toEqual(snapshot);
  });
});
