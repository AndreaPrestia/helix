import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { ExecutionPlanner } from './execution-planner.js';
import type { PlanInput, PlanStepInput } from './model.js';

const planner = new ExecutionPlanner();

function step(
  id: string,
  dependsOn: readonly string[] = [],
  requiredCapability = 'coder',
  risk: PlanStepInput['risk'] = 'low',
): PlanStepInput {
  return { id, description: `do ${id}`, dependsOn, requiredCapability, risk };
}

describe('ExecutionPlanner decomposition and dependency graph', () => {
  it('orders steps by a deterministic topological sort', () => {
    const input: PlanInput = {
      goal: 'ship feature',
      steps: [step('c', ['a', 'b']), step('b', ['a']), step('a')],
    };
    const result = planner.plan(input);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.order).toEqual(['a', 'b', 'c']);
    }
  });

  it('breaks ties by ascending id (deterministic)', () => {
    const input: PlanInput = { goal: 'g', steps: [step('z'), step('m'), step('a')] };
    const first = planner.plan(input);
    const second = planner.plan(input);
    if (isOk(first) && isOk(second)) {
      expect(first.value.order).toEqual(['a', 'm', 'z']);
      expect(first.value.id).toBe(second.value.id);
    }
  });

  it('rejects unknown dependencies', () => {
    const result = planner.plan({ goal: 'g', steps: [step('a', ['ghost'])] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.some((i) => i.includes('unknown step'))).toBe(true);
    }
  });

  it('rejects duplicate step ids', () => {
    const result = planner.plan({ goal: 'g', steps: [step('a'), step('a')] });
    expect(isErr(result)).toBe(true);
  });

  it('detects dependency cycles', () => {
    const result = planner.plan({ goal: 'g', steps: [step('a', ['b']), step('b', ['a'])] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues).toContain('dependency cycle detected');
    }
  });
});

describe('ExecutionPlanner capability matching', () => {
  it('accepts steps whose capabilities are available', () => {
    const result = planner.plan({
      goal: 'g',
      steps: [step('a', [], 'coder'), step('b', [], 'reviewer')],
      availableCapabilities: ['coder', 'reviewer'],
    });
    if (isOk(result)) {
      expect(result.value.requiredCapabilities).toEqual(['coder', 'reviewer']);
    }
  });

  it('rejects steps requiring an unavailable capability', () => {
    const result = planner.plan({
      goal: 'g',
      steps: [step('a', [], 'ml-specialist')],
      availableCapabilities: ['coder'],
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.some((i) => i.includes('no capability match'))).toBe(true);
    }
  });
});

describe('ExecutionPlanner risk annotations', () => {
  it('reports the highest risk across steps', () => {
    const result = planner.plan({
      goal: 'g',
      steps: [step('a', [], 'coder', 'low'), step('b', [], 'coder', 'high')],
    });
    if (isOk(result)) {
      expect(result.value.overallRisk).toBe('high');
    }
  });

  it('rejects an invalid risk level', () => {
    const bad: PlanStepInput = {
      id: 'a',
      description: 'x',
      dependsOn: [],
      requiredCapability: 'coder',
      risk: 'critical' as 'high',
    };
    expect(isErr(planner.plan({ goal: 'g', steps: [bad] }))).toBe(true);
  });
});

describe('ExecutionPlanner deterministic identifiers', () => {
  it('produces a stable id for identical plans and a different id otherwise', () => {
    const a = planner.plan({ goal: 'g', steps: [step('a')] });
    const b = planner.plan({ goal: 'g', steps: [step('a')] });
    const c = planner.plan({ goal: 'g2', steps: [step('a')] });
    if (isOk(a) && isOk(b) && isOk(c)) {
      expect(a.value.id).toBe(b.value.id);
      expect(a.value.id).toMatch(/^[0-9a-f]{64}$/);
      expect(a.value.id).not.toBe(c.value.id);
    }
  });
});
