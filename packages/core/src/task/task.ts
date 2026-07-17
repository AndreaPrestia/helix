import { AggregateRoot } from '../aggregate-root.js';
import { type DomainError, InvariantViolation, ValidationError } from '../domain-error.js';
import { Identifier } from '../identifier.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { type Result, err, ok } from '../result.js';
import { taskEventNames } from './events.js';
import { type TaskSnapshot } from './snapshot.js';
import { type TaskStatus, canTransition } from './status.js';

/** Typed identifier for a task. */
export type TaskId = Identifier<'task'>;

/** Ports required to perform task behaviors deterministically. */
export interface TaskDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/**
 * The Task aggregate root. It protects its lifecycle invariants, expresses
 * transitions as behavior, supports blocking/cancellation, and records domain
 * events rather than exposing mutable state (ADR-0015).
 */
export class Task extends AggregateRoot<TaskId> {
  #title: string;
  #status: TaskStatus;
  #version: number;

  private constructor(id: TaskId, title: string, status: TaskStatus, version: number) {
    super(id);
    this.#title = title;
    this.#status = status;
    this.#version = version;
  }

  get title(): string {
    return this.#title;
  }

  get status(): TaskStatus {
    return this.#status;
  }

  get version(): number {
    return this.#version;
  }

  /** Create a new task in the `draft` state. */
  static create(id: TaskId, title: string, deps: TaskDependencies): Result<Task, ValidationError> {
    if (title.trim().length === 0) {
      return err(new ValidationError('task title must be a non-empty string'));
    }
    const task = new Task(id, title, 'draft', 1);
    task.#emit(taskEventNames.created, { title }, deps);
    return ok(task);
  }

  /** Move a draft task to `ready`. */
  markReady(deps: TaskDependencies): Result<Task, InvariantViolation> {
    return this.#transition('ready', taskEventNames.readied, deps);
  }

  /** Start work on a ready task. */
  start(deps: TaskDependencies): Result<Task, InvariantViolation> {
    return this.#transition('in_progress', taskEventNames.started, deps);
  }

  /** Submit in-progress work for review. */
  submitForReview(deps: TaskDependencies): Result<Task, InvariantViolation> {
    return this.#transition('review', taskEventNames.submittedForReview, deps);
  }

  /** Approve and complete a task under review. */
  complete(deps: TaskDependencies): Result<Task, InvariantViolation> {
    return this.#transition('completed', taskEventNames.completed, deps);
  }

  /** Block an in-progress task, recording the reason. */
  block(reason: string, deps: TaskDependencies): Result<Task, DomainError> {
    if (reason.trim().length === 0) {
      return err(new ValidationError('a block reason is required'));
    }
    const from = this.#status;
    if (!canTransition(from, 'blocked')) {
      return err(new InvariantViolation(`cannot transition task from ${from} to blocked`));
    }
    this.#status = 'blocked';
    this.#version += 1;
    this.#emit(taskEventNames.blocked, { from, to: 'blocked', reason }, deps);
    return ok(this);
  }

  /** Resume a blocked task. */
  unblock(deps: TaskDependencies): Result<Task, InvariantViolation> {
    return this.#transition('in_progress', taskEventNames.unblocked, deps);
  }

  /** Cancel a task from any non-terminal state, recording the reason. */
  cancel(reason: string, deps: TaskDependencies): Result<Task, DomainError> {
    if (reason.trim().length === 0) {
      return err(new ValidationError('a cancellation reason is required'));
    }
    const from = this.#status;
    if (!canTransition(from, 'cancelled')) {
      return err(new InvariantViolation(`cannot transition task from ${from} to cancelled`));
    }
    this.#status = 'cancelled';
    this.#version += 1;
    this.#emit(taskEventNames.cancelled, { from, to: 'cancelled', reason }, deps);
    return ok(this);
  }

  #transition(
    to: TaskStatus,
    eventName: string,
    deps: TaskDependencies,
  ): Result<Task, InvariantViolation> {
    const from = this.#status;
    if (!canTransition(from, to)) {
      return err(new InvariantViolation(`cannot transition task from ${from} to ${to}`));
    }
    this.#status = to;
    this.#version += 1;
    this.#emit(eventName, { from, to }, deps);
    return ok(this);
  }

  #emit<Payload>(name: string, payload: Payload, deps: TaskDependencies): void {
    this.raise({
      eventId: deps.ids.next(),
      name,
      aggregateId: this.id.value,
      occurredAt: deps.clock.now(),
      payload,
    });
  }

  /** Produce an immutable snapshot of the aggregate's state. */
  toSnapshot(): TaskSnapshot {
    return {
      id: this.id.value,
      title: this.#title,
      status: this.#status,
      version: this.#version,
    };
  }

  /** Rehydrate a task from a snapshot. No domain events are emitted. */
  static fromSnapshot(snapshot: TaskSnapshot): Result<Task, ValidationError> {
    const id = Identifier.create('task', snapshot.id);
    if (!id.ok) {
      return id;
    }
    return ok(new Task(id.value, snapshot.title, snapshot.status, snapshot.version));
  }
}
