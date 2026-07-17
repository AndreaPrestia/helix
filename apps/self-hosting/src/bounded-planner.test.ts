import { describe, expect, it } from 'vitest';
import { BoundedPlanner, DEFAULT_MAX_PLAN_STEPS } from './bounded-planner.js';

describe('BoundedPlanner', () => {
  it('builds a plan with indexed steps', () => {
    const result = new BoundedPlanner().plan('0030', ['implement', 'verify']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.steps).toEqual([
        { index: 0, description: 'implement' },
        { index: 1, description: 'verify' },
      ]);
      expect(result.value.maxSteps).toBe(DEFAULT_MAX_PLAN_STEPS);
    }
  });

  it('trims and drops blank step descriptions', () => {
    const result = new BoundedPlanner().plan('0030', ['  do  ', '', '   ']);
    expect(result.ok && result.value.steps).toEqual([{ index: 0, description: 'do' }]);
  });

  it('rejects an empty plan', () => {
    const result = new BoundedPlanner().plan('0030', ['', '  ']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EMPTY_PLAN');
    }
  });

  it('rejects a plan exceeding the budget rather than truncating', () => {
    const result = new BoundedPlanner(2).plan('0030', ['a', 'b', 'c']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PLAN_TOO_LARGE');
    }
  });
});
