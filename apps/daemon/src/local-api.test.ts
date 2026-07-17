import type { Clock, IdGenerator } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { Daemon } from './daemon.js';
import { InMemoryDaemonStateStore } from './store.js';
import { LocalApi, type DaemonResponse } from './local-api.js';

function fakeClock(): Clock {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) };
}

function seqIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

function api(): LocalApi {
  const daemon = new Daemon({
    clock: fakeClock(),
    ids: seqIds(),
    store: new InMemoryDaemonStateStore(),
  });
  return new LocalApi(daemon);
}

function expectOk(response: DaemonResponse): { ok: true; result: unknown } {
  if (!response.ok) {
    throw new Error(`expected ok response, got ${response.code}`);
  }
  return response;
}

describe('LocalApi', () => {
  it('reports status', () => {
    expect(expectOk(api().handle({ type: 'status' })).result).toEqual({ status: 'running' });
  });

  it('opens and lists sessions', () => {
    const local = api();
    const opened = expectOk(local.handle({ type: 'openSession', workspaceRoot: '/repo/a' }));
    expect(opened.result).toMatchObject({ workspaceRoot: '/repo/a', status: 'active' });
    const listed = expectOk(local.handle({ type: 'listSessions' }));
    expect(Array.isArray(listed.result)).toBe(true);
  });

  it('maps a daemon error to a failure response', () => {
    const response = api().handle({ type: 'enqueueJob', sessionId: 'missing', kind: 'build' });
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe('SESSION_NOT_FOUND');
    }
  });

  it('returns null when there is no job to claim', () => {
    expect(expectOk(api().handle({ type: 'claimJob' })).result).toBeNull();
  });

  it('drives an enqueue → claim → complete flow', () => {
    const local = api();
    const session = expectOk(local.handle({ type: 'openSession', workspaceRoot: '/repo/a' }))
      .result as { id: string };
    const job = expectOk(local.handle({ type: 'enqueueJob', sessionId: session.id, kind: 'build' }))
      .result as { id: string };
    const claimed = expectOk(local.handle({ type: 'claimJob' })).result as { id: string };
    expect(claimed.id).toBe(job.id);
    const completed = expectOk(local.handle({ type: 'completeJob', jobId: job.id })).result as {
      status: string;
    };
    expect(completed.status).toBe('succeeded');
  });

  it('handles shutdown and then refuses new work', () => {
    const local = api();
    expectOk(local.handle({ type: 'shutdown' }));
    expect(expectOk(local.handle({ type: 'status' })).result).toEqual({ status: 'stopped' });
    const rejected = local.handle({ type: 'openSession', workspaceRoot: '/repo/a' });
    expect(rejected.ok).toBe(false);
  });
});
