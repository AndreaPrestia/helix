import type { Clock, IdGenerator } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { Daemon, type DaemonDeps } from './daemon.js';
import { InMemoryDaemonStateStore } from './store.js';

function fakeClock(): Clock {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) };
}

function seqIds(prefix = 'id'): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

function deps(store = new InMemoryDaemonStateStore()): DaemonDeps {
  return { clock: fakeClock(), ids: seqIds(), store };
}

describe('Daemon sessions and jobs', () => {
  it('opens a session and persists state write-through', () => {
    const store = new InMemoryDaemonStateStore();
    const daemon = new Daemon(deps(store));
    const opened = daemon.openSession('/repo/a');
    expect(opened.ok).toBe(true);
    const loaded = store.load();
    expect(loaded.some && loaded.value.sessions).toHaveLength(1);
  });

  it('rejects enqueuing a job for an unknown or inactive session', () => {
    const daemon = new Daemon(deps());
    const result = daemon.enqueueJob('missing', 'build');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SESSION_NOT_FOUND');
    }
  });

  it('runs a full enqueue → claim → complete flow', () => {
    const daemon = new Daemon(deps());
    const session = daemon.openSession('/repo/a');
    if (!session.ok) throw new Error('expected session');
    const job = daemon.enqueueJob(session.value.id, 'build');
    if (!job.ok) throw new Error('expected job');
    const claimed = daemon.claimJob();
    expect(claimed.some && claimed.value.id).toBe(job.value.id);
    const done = daemon.completeJob(job.value.id);
    expect(done.ok && done.value.status).toBe('succeeded');
  });

  it('cancels queued jobs when a session is closed', () => {
    const daemon = new Daemon(deps());
    const session = daemon.openSession('/repo/a');
    if (!session.ok) throw new Error('expected session');
    daemon.enqueueJob(session.value.id, 'build');
    daemon.closeSession(session.value.id);
    expect(daemon.listJobs().every((j) => j.status === 'canceled')).toBe(true);
  });
});

describe('Daemon shutdown and recovery', () => {
  it('shuts down safely and refuses new work', () => {
    const daemon = new Daemon(deps());
    const snapshot = daemon.shutdown();
    expect(daemon.status()).toBe('stopped');
    expect(snapshot.sessions).toEqual([]);
    const rejected = daemon.openSession('/repo/a');
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe('DAEMON_NOT_ACCEPTING');
    }
  });

  it('shutdown is idempotent', () => {
    const daemon = new Daemon(deps());
    daemon.shutdown();
    expect(() => daemon.shutdown()).not.toThrow();
    expect(daemon.status()).toBe('stopped');
  });

  it('recovers persisted state and re-queues interrupted jobs', () => {
    const store = new InMemoryDaemonStateStore();
    const first = new Daemon(deps(store));
    const session = first.openSession('/repo/a');
    if (!session.ok) throw new Error('expected session');
    const job = first.enqueueJob(session.value.id, 'build');
    if (!job.ok) throw new Error('expected job');
    first.claimJob(); // job now running and persisted

    const recovered = Daemon.recover({ clock: fakeClock(), ids: seqIds('r'), store });
    expect(recovered.status()).toBe('running');
    expect(recovered.listSessions()).toHaveLength(1);
    const recoveredJob = recovered.getJob(job.value.id);
    expect(recoveredJob.some && recoveredJob.value.status).toBe('queued');
  });

  it('recover with no persisted state starts empty and running', () => {
    const recovered = Daemon.recover(deps());
    expect(recovered.status()).toBe('running');
    expect(recovered.listSessions()).toEqual([]);
    expect(recovered.listJobs()).toEqual([]);
  });
});
