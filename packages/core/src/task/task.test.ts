import { describe, expect, it } from 'vitest';
import { Identifier } from '../identifier.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { isErr, isOk } from '../result.js';
import { taskEventNames } from './events.js';
import { Task, type TaskDependencies, type TaskId } from './task.js';

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
    return `evt_${this.#counter}`;
  }
}

function makeDeps(): TaskDependencies {
  return {
    clock: new FixedClock(new Date('2026-07-17T00:00:00.000Z')),
    ids: new SequentialIdGenerator(),
  };
}

function taskId(value = 'TASK-HELIX-0001'): TaskId {
  const id = Identifier.create('task', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

function newTask(deps: TaskDependencies): Task {
  const created = Task.create(taskId(), 'Implement login', deps);
  if (!isOk(created)) {
    throw new Error('setup failed');
  }
  return created.value;
}

describe('Task creation', () => {
  it('creates a draft and records a created event', () => {
    const deps = makeDeps();
    const result = Task.create(taskId(), 'Implement login', deps);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('draft');
      expect(result.value.title).toBe('Implement login');
      expect(result.value.version).toBe(1);
      expect(result.value.domainEvents.map((event) => event.name)).toEqual([
        taskEventNames.created,
      ]);
    }
  });

  it('rejects an empty title', () => {
    expect(isErr(Task.create(taskId(), '   ', makeDeps()))).toBe(true);
  });
});

describe('Task lifecycle', () => {
  it('follows the happy path and emits events in order', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    expect(isOk(task.markReady(deps))).toBe(true);
    expect(isOk(task.start(deps))).toBe(true);
    expect(isOk(task.submitForReview(deps))).toBe(true);
    expect(isOk(task.complete(deps))).toBe(true);
    expect(task.status).toBe('completed');
    expect(task.domainEvents.map((event) => event.name)).toEqual([
      taskEventNames.created,
      taskEventNames.readied,
      taskEventNames.started,
      taskEventNames.submittedForReview,
      taskEventNames.completed,
    ]);
  });

  it('rejects an illegal transition and preserves state', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    const result = task.start(deps);
    expect(isErr(result)).toBe(true);
    expect(task.status).toBe('draft');
  });
});

describe('Task blocking', () => {
  it('blocks an in-progress task with a reason and resumes', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    task.markReady(deps);
    task.start(deps);
    const blocked = task.block('waiting on API', deps);
    expect(isOk(blocked)).toBe(true);
    expect(task.status).toBe('blocked');

    const blockEvent = task.domainEvents.find((event) => event.name === taskEventNames.blocked);
    expect(blockEvent?.payload).toEqual({
      from: 'in_progress',
      to: 'blocked',
      reason: 'waiting on API',
    });

    expect(isOk(task.unblock(deps))).toBe(true);
    expect(task.status).toBe('in_progress');
  });

  it('requires a non-empty block reason', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    task.markReady(deps);
    task.start(deps);
    expect(isErr(task.block('  ', deps))).toBe(true);
    expect(task.status).toBe('in_progress');
  });

  it('cannot block a task that is not in progress', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    expect(isErr(task.block('reason', deps))).toBe(true);
  });
});

describe('Task cancellation', () => {
  it('cancels from a non-terminal state with a reason', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    task.markReady(deps);
    const cancelled = task.cancel('deprioritized', deps);
    expect(isOk(cancelled)).toBe(true);
    expect(task.status).toBe('cancelled');
    const cancelEvent = task.domainEvents.find((event) => event.name === taskEventNames.cancelled);
    expect(cancelEvent?.payload).toEqual({
      from: 'ready',
      to: 'cancelled',
      reason: 'deprioritized',
    });
  });

  it('requires a non-empty cancellation reason', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    expect(isErr(task.cancel('', deps))).toBe(true);
  });

  it('cannot cancel a completed task', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    task.markReady(deps);
    task.start(deps);
    task.submitForReview(deps);
    task.complete(deps);
    expect(isErr(task.cancel('too late', deps))).toBe(true);
    expect(task.status).toBe('completed');
  });
});

describe('Task snapshot and determinism', () => {
  it('round-trips through a snapshot without emitting events', () => {
    const deps = makeDeps();
    const task = newTask(deps);
    task.markReady(deps);
    const snapshot = task.toSnapshot();
    const rehydrated = Task.fromSnapshot(snapshot);
    expect(isOk(rehydrated)).toBe(true);
    if (isOk(rehydrated)) {
      expect(rehydrated.value.toSnapshot()).toEqual(snapshot);
      expect(rehydrated.value.domainEvents).toHaveLength(0);
    }
  });

  it('produces identical events for identical inputs', () => {
    const a = newTask(makeDeps());
    const b = newTask(makeDeps());
    a.markReady(makeDeps());
    b.markReady(makeDeps());
    expect(a.domainEvents).toEqual(b.domainEvents);
  });
});
