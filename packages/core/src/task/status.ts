/** The task lifecycle states (see `state-machines.md`, plus `cancelled`). */
export const taskStatuses = [
  'draft',
  'ready',
  'in_progress',
  'blocked',
  'review',
  'completed',
  'cancelled',
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

/**
 * Allowed transitions for a task.
 *
 * The frozen `state-machines.md` lists the states
 * `draft → ready → in_progress → blocked → review → completed`. `blocked` is
 * modeled as a recoverable side-state of `in_progress`, and `cancelled` is a
 * terminal state required by the "blocking and cancellation" requirement.
 */
export const taskTransitions: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  draft: ['ready', 'cancelled'],
  ready: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'review', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  review: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Whether `to` is a permitted next state from `from`. */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return taskTransitions[from].includes(to);
}
