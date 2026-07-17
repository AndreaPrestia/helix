import type { TaskStatus } from './status.js';

/** Immutable snapshot of a {@link Task} aggregate. */
export interface TaskSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly version: number;
}
