import { describe, expect, it } from 'vitest';
import { canTransition, taskStatuses, taskTransitions } from './status.js';

describe('task status machine', () => {
  it('enumerates the lifecycle states including the terminal cancelled state', () => {
    expect(taskStatuses).toEqual([
      'draft',
      'ready',
      'in_progress',
      'blocked',
      'review',
      'completed',
      'cancelled',
    ]);
  });

  it('permits the intended transitions', () => {
    expect(canTransition('draft', 'ready')).toBe(true);
    expect(canTransition('ready', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'blocked')).toBe(true);
    expect(canTransition('in_progress', 'review')).toBe(true);
    expect(canTransition('blocked', 'in_progress')).toBe(true);
    expect(canTransition('review', 'completed')).toBe(true);
  });

  it('allows cancellation from every non-terminal state', () => {
    for (const status of ['draft', 'ready', 'in_progress', 'blocked', 'review'] as const) {
      expect(canTransition(status, 'cancelled')).toBe(true);
    }
  });

  it('rejects transitions out of terminal states', () => {
    expect(taskTransitions.completed).toEqual([]);
    expect(taskTransitions.cancelled).toEqual([]);
    expect(canTransition('completed', 'review')).toBe(false);
    expect(canTransition('cancelled', 'draft')).toBe(false);
  });

  it('rejects illegal jumps', () => {
    expect(canTransition('draft', 'in_progress')).toBe(false);
    expect(canTransition('ready', 'review')).toBe(false);
  });
});
