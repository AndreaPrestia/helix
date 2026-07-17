import { none, some } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { DashboardApi } from './api.js';
import { TokenAuthenticator, type Principal } from './auth.js';
import { Dashboard } from './dashboard.js';
import type { DashboardSnapshot } from './model.js';
import type { DashboardSource } from './source.js';

const principal: Principal = { id: 'local' };
const TOKEN = 'good-token';

const snapshot: DashboardSnapshot = {
  sessions: [
    { id: 's-1', workspaceRoot: '/repo/a', status: 'active', openedAt: '2026-01-01T00:00:00.000Z' },
  ],
  jobs: [
    {
      id: 'j-1',
      sessionId: 's-1',
      kind: 'build',
      status: 'failed',
      sequence: 0,
      enqueuedAt: '2026-01-01T00:00:00.000Z',
      failure: 'boom',
    },
  ],
};

function source(): DashboardSource {
  return { snapshot: () => snapshot };
}

function makeApi(readOnly = true): DashboardApi {
  const dashboard = new Dashboard(source());
  const authenticator = new TokenAuthenticator(new Map([[TOKEN, principal]]));
  return new DashboardApi(dashboard, authenticator, { readOnly });
}

describe('DashboardApi authentication', () => {
  it('rejects requests without a valid token', () => {
    const response = makeApi().handle({ type: 'summary' }, none());
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe('UNAUTHENTICATED');
    }
  });

  it('serves an authenticated request', () => {
    const response = makeApi().handle({ type: 'summary' }, some(TOKEN));
    expect(response.ok).toBe(true);
  });
});

describe('DashboardApi read-only mode', () => {
  it('refuses a mutating request even when authenticated', () => {
    const response = makeApi(true).handle({ type: 'cancelRun', id: 'j-1' }, some(TOKEN));
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe('READ_ONLY');
    }
  });

  it('still refuses control actions when read-only mode is disabled (monitoring surface)', () => {
    const response = makeApi(false).handle({ type: 'cancelRun', id: 'j-1' }, some(TOKEN));
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe('READ_ONLY');
    }
  });
});

describe('DashboardApi read queries', () => {
  it('returns the summary', () => {
    const response = makeApi().handle({ type: 'summary' }, some(TOKEN));
    expect(response.ok && response.result).toMatchObject({ failures: 1 });
  });

  it('lists runs filtered by status', () => {
    const response = makeApi().handle({ type: 'runs', status: 'failed' }, some(TOKEN));
    expect(response.ok && (response.result as unknown[]).length).toBe(1);
  });

  it('lists failures', () => {
    const response = makeApi().handle({ type: 'failures' }, some(TOKEN));
    expect(response.ok && (response.result as { failure: string }[])[0]?.failure).toBe('boom');
  });

  it('returns null for a missing task', () => {
    const response = makeApi().handle({ type: 'task', id: 'missing' }, some(TOKEN));
    expect(response.ok && response.result).toBeNull();
  });
});
