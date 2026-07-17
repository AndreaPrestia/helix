import type { Clock, IdGenerator } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { JobScheduler } from './job-scheduler.js';

function fakeClock(): Clock {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)) };
}

function seqIds(prefix = 'j'): IdGenerator {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

describe('JobScheduler', () => {
  it('enqueues jobs with a monotonic sequence', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    const a = scheduler.enqueue('s-1', 'build');
    const b = scheduler.enqueue('s-1', 'test');
    expect(a).toMatchObject({ id: 'j-1', status: 'queued', sequence: 0 });
    expect(b).toMatchObject({ id: 'j-2', status: 'queued', sequence: 1 });
  });

  it('claims queued jobs in FIFO order', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    scheduler.enqueue('s-1', 'build');
    scheduler.enqueue('s-1', 'test');
    const first = scheduler.claimNext();
    expect(first.some && first.value.id).toBe('j-1');
    expect(first.some && first.value.status).toBe('running');
    const second = scheduler.claimNext();
    expect(second.some && second.value.id).toBe('j-2');
  });

  it('returns none when there is nothing to claim', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    expect(scheduler.claimNext().some).toBe(false);
  });

  it('completes a running job', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    scheduler.enqueue('s-1', 'build');
    const claimed = scheduler.claimNext();
    if (!claimed.some) throw new Error('expected claim');
    const done = scheduler.complete(claimed.value.id);
    expect(done.ok && done.value.status).toBe('succeeded');
  });

  it('fails a running job with a reason', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    scheduler.enqueue('s-1', 'build');
    const claimed = scheduler.claimNext();
    if (!claimed.some) throw new Error('expected claim');
    const failed = scheduler.fail(claimed.value.id, 'boom');
    expect(failed.ok && failed.value.status).toBe('failed');
    expect(failed.ok && failed.value.failure).toBe('boom');
  });

  it('rejects completing a queued (not running) job', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    const job = scheduler.enqueue('s-1', 'build');
    const result = scheduler.complete(job.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_JOB_STATE');
    }
  });

  it('errors on an unknown job', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    const result = scheduler.cancel('missing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('JOB_NOT_FOUND');
    }
  });

  it('cancels queued jobs for a session', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    scheduler.enqueue('s-1', 'build');
    scheduler.enqueue('s-2', 'build');
    scheduler.enqueue('s-1', 'test');
    const canceled = scheduler.cancelQueuedForSession('s-1');
    expect(canceled.map((j) => j.id)).toEqual(['j-1', 'j-3']);
    expect(scheduler.pending().map((j) => j.id)).toEqual(['j-2']);
  });

  it('re-queues running jobs on restore (safe recovery)', () => {
    const scheduler = new JobScheduler(fakeClock(), seqIds());
    scheduler.enqueue('s-1', 'build');
    scheduler.claimNext();
    const snapshot = scheduler.snapshot();
    expect(snapshot.jobs[0]?.status).toBe('running');

    const recovered = new JobScheduler(fakeClock(), seqIds());
    recovered.restore(snapshot.jobs, snapshot.sequence);
    expect(recovered.get('j-1').some).toBe(true);
    expect(recovered.list()[0]?.status).toBe('queued');
    expect(recovered.sequence).toBe(1);
  });
});
