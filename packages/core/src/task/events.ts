import type { TaskStatus } from './status.js';

/** Names of the domain events emitted by the task aggregate. */
export const taskEventNames = {
  created: 'task.created',
  readied: 'task.readied',
  started: 'task.started',
  blocked: 'task.blocked',
  unblocked: 'task.unblocked',
  submittedForReview: 'task.submitted-for-review',
  completed: 'task.completed',
  cancelled: 'task.cancelled',
} as const;

export interface TaskCreatedPayload {
  readonly title: string;
}

export interface TaskStatusChangedPayload {
  readonly from: TaskStatus;
  readonly to: TaskStatus;
}

export interface TaskBlockedPayload extends TaskStatusChangedPayload {
  readonly reason: string;
}

export interface TaskCancelledPayload extends TaskStatusChangedPayload {
  readonly reason: string;
}
