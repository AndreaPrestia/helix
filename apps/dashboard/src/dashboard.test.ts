import { describe, expect, it } from 'vitest';
import { Dashboard, DEFAULT_VIEW_LIMIT } from './dashboard.js';
import type { DashboardSnapshot, JobRecord, SessionRecord } from './model.js';
import type { DashboardSource } from './source.js';

function session(id: string, status: SessionRecord['status'] = 'active'): SessionRecord {
  return { id, workspaceRoot: `/repo/${id}`, status, openedAt: '2026-01-01T00:00:00.000Z' };
}

function job(
  id: string,
  sequence: number,
  status: JobRecord['status'],
  failure?: string,
): JobRecord {
  return {
    id,
    sessionId: 's-1',
    kind: 'build',
    status,
    sequence,
    enqueuedAt: '2026-01-01T00:00:00.000Z',
    ...(failure !== undefined ? { failure, finishedAt: '2026-01-01T00:01:00.000Z' } : {}),
  };
}

function source(snapshot: DashboardSnapshot): DashboardSource {
  return { snapshot: () => snapshot };
}

const sample: DashboardSnapshot = {
  sessions: [session('s-2', 'closed'), session('s-1', 'active')],
  jobs: [job('j-3', 2, 'failed', 'boom'), job('j-1', 0, 'succeeded'), job('j-2', 1, 'running')],
};

describe('Dashboard.summary', () => {
  it('produces mobile-friendly counts', () => {
    const summary = new Dashboard(source(sample)).summary();
    expect(summary.sessions).toEqual({ active: 1, closed: 1 });
    expect(summary.runs).toEqual({ queued: 0, running: 1, succeeded: 1, failed: 1, canceled: 0 });
    expect(summary.failures).toBe(1);
    expect(summary.needsReview).toBe(1);
  });
});

describe('Dashboard.tasks', () => {
  it('lists tasks id-sorted', () => {
    expect(new Dashboard(source(sample)).tasks().map((t) => t.id)).toEqual(['s-1', 's-2']);
  });

  it('bounds the default list size', () => {
    const many = Array.from({ length: DEFAULT_VIEW_LIMIT + 5 }, (_, i) =>
      session(`s-${String(i).padStart(3, '0')}`),
    );
    const dash = new Dashboard(source({ sessions: many, jobs: [] }));
    expect(dash.tasks()).toHaveLength(DEFAULT_VIEW_LIMIT);
  });
});

describe('Dashboard.runs', () => {
  it('lists runs sequence-sorted', () => {
    expect(new Dashboard(source(sample)).runs().map((r) => r.id)).toEqual(['j-1', 'j-2', 'j-3']);
  });

  it('filters by status', () => {
    expect(new Dashboard(source(sample)).runs('failed').map((r) => r.id)).toEqual(['j-3']);
  });
});

describe('Dashboard.failures', () => {
  it('surfaces failed runs with their reason', () => {
    const failures = new Dashboard(source(sample)).failures();
    expect(failures).toEqual([
      {
        id: 'j-3',
        sessionId: 's-1',
        kind: 'build',
        failure: 'boom',
        finishedAt: '2026-01-01T00:01:00.000Z',
      },
    ]);
  });
});

describe('Dashboard single lookups', () => {
  it('returns a task by id', () => {
    const task = new Dashboard(source(sample)).task('s-1');
    expect(task.some && task.value.workspaceRoot).toBe('/repo/s-1');
  });

  it('returns none for a missing task', () => {
    expect(new Dashboard(source(sample)).task('missing').some).toBe(false);
  });

  it('returns a run by id', () => {
    const run = new Dashboard(source(sample)).run('j-2');
    expect(run.some && run.value.status).toBe('running');
  });
});
