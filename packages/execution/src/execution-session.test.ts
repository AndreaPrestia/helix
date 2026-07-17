import { type Clock, type IdGenerator, isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { ExecutionSession, type SessionDependencies } from './execution-session.js';

class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}
  now(): Date {
    return this.instant;
  }
}

class SequentialIdGenerator implements IdGenerator {
  #counter = 0;
  next(): string {
    this.#counter += 1;
    return `id_${this.#counter}`;
  }
}

function makeDeps(): SessionDependencies {
  return {
    clock: new FixedClock(new Date('2026-07-17T00:00:00.000Z')),
    ids: new SequentialIdGenerator(),
  };
}

function runningSession(allowedTools: readonly string[] = ['read', 'write']): ExecutionSession {
  const started = ExecutionSession.start('ses-1', { allowedTools });
  if (!isOk(started)) {
    throw new Error('setup failed');
  }
  return started.value;
}

describe('ExecutionSession lifecycle', () => {
  it('starts in the running state', () => {
    const session = runningSession();
    expect(session.status).toBe('running');
    expect(session.allowedTools).toEqual(['read', 'write']);
  });

  it('rejects an empty session id', () => {
    expect(isErr(ExecutionSession.start('  '))).toBe(true);
  });

  it('completes, then rejects further termination', () => {
    const session = runningSession();
    expect(isOk(session.complete())).toBe(true);
    expect(session.status).toBe('completed');
    expect(isErr(session.cancel('too late'))).toBe(true);
  });

  it('cancels with a required reason', () => {
    const session = runningSession();
    expect(isErr(session.cancel(''))).toBe(true);
    expect(isOk(session.cancel('user aborted'))).toBe(true);
    expect(session.status).toBe('cancelled');
  });
});

describe('ExecutionSession tool permissions (deny by default)', () => {
  it('authorizes only permitted tools', () => {
    const session = runningSession(['read']);
    expect(isOk(session.authorizeTool('read'))).toBe(true);
    const denied = session.authorizeTool('write');
    expect(isErr(denied)).toBe(true);
    if (isErr(denied)) {
      expect(denied.error.code).toBe('TOOL_PERMISSION_DENIED');
    }
  });

  it('denies every tool when none are allowed', () => {
    const session = runningSession([]);
    expect(isErr(session.authorizeTool('read'))).toBe(true);
  });

  it('records tool usage on invoke', () => {
    const session = runningSession(['read']);
    expect(isOk(session.invokeTool('read'))).toBe(true);
    expect(session.usedTools).toEqual(['read']);
    expect(isErr(session.invokeTool('write'))).toBe(true);
  });

  it('rejects tool use after termination', () => {
    const session = runningSession(['read']);
    session.complete();
    expect(isErr(session.authorizeTool('read'))).toBe(true);
  });
});

describe('ExecutionSession artifact capture', () => {
  it('captures artifacts while running', () => {
    const session = runningSession();
    const deps = makeDeps();
    const result = session.captureArtifact({ name: 'diff.patch', kind: 'patch' }, deps);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe('id_1');
      expect(session.artifacts).toHaveLength(1);
    }
  });

  it('rejects invalid artifacts and capture after cancellation', () => {
    const session = runningSession();
    const deps = makeDeps();
    expect(isErr(session.captureArtifact({ name: '', kind: 'patch' }, deps))).toBe(true);
    session.cancel('stop');
    expect(isErr(session.captureArtifact({ name: 'x', kind: 'y' }, deps))).toBe(true);
  });
});

describe('ExecutionSession checkpointing and resume', () => {
  it('captures a checkpoint and restores a resumable session', () => {
    const session = runningSession(['read']);
    const deps = makeDeps();
    session.invokeTool('read');
    session.captureArtifact({ name: 'notes.md', kind: 'doc' }, deps);

    const checkpoint = session.checkpoint('after-read', deps);
    expect(isOk(checkpoint)).toBe(true);
    if (!isOk(checkpoint)) {
      return;
    }
    expect(checkpoint.value.usedTools).toEqual(['read']);
    expect(checkpoint.value.artifacts).toHaveLength(1);
    expect(checkpoint.value.createdAt).toEqual(new Date('2026-07-17T00:00:00.000Z'));

    const resumed = ExecutionSession.restore(checkpoint.value);
    expect(resumed.status).toBe('running');
    expect(resumed.usedTools).toEqual(['read']);
    expect(resumed.artifacts).toHaveLength(1);
    // The resumed session retains its permissions and can continue.
    expect(isOk(resumed.invokeTool('read'))).toBe(true);
  });

  it('cannot checkpoint a terminated session', () => {
    const session = runningSession();
    session.complete();
    expect(isErr(session.checkpoint('late', makeDeps()))).toBe(true);
  });
});
