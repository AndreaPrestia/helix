import { fromNullable, type Option } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { BoundedPlanner } from './bounded-planner.js';
import type {
  ChangeExecutor,
  ChangeSummary,
  ExecutionRecord,
  PlanStep,
  SpecReader,
} from './model.js';
import { ReviewLog } from './review-log.js';
import { SelfHostingWorkflow, type SelfHostingDeps } from './workflow.js';

function reader(changes: readonly ChangeSummary[]): SpecReader {
  const byId = new Map(changes.map((c) => [c.id, c]));
  return {
    changes: () => changes,
    change: (id): Option<ChangeSummary> => fromNullable(byId.get(id)),
  };
}

const succeedingExecutor: ChangeExecutor = {
  execute: (_id, step: PlanStep): ExecutionRecord => ({
    index: step.index,
    description: step.description,
    status: 'succeeded',
  }),
};

function failingAt(failIndex: number): ChangeExecutor {
  return {
    execute: (_id, step: PlanStep): ExecutionRecord =>
      step.index === failIndex
        ? { index: step.index, description: step.description, status: 'failed', detail: 'boom' }
        : { index: step.index, description: step.description, status: 'succeeded' },
  };
}

function change(overrides: Partial<ChangeSummary> = {}): ChangeSummary {
  return {
    id: overrides.id ?? '0030',
    status: overrides.status ?? 'accepted',
    approved: overrides.approved ?? true,
    steps: overrides.steps ?? ['implement', 'verify'],
  };
}

function workflow(
  changes: readonly ChangeSummary[],
  executor: ChangeExecutor = succeedingExecutor,
): { workflow: SelfHostingWorkflow; reviewLog: ReviewLog } {
  const reviewLog = new ReviewLog();
  const deps: SelfHostingDeps = {
    specs: reader(changes),
    planner: new BoundedPlanner(),
    executor,
    reviewLog,
  };
  return { workflow: new SelfHostingWorkflow(deps), reviewLog };
}

describe('SelfHostingWorkflow', () => {
  it('reads a change from its own specs and rejects an unknown change', () => {
    const { workflow: wf } = workflow([change()]);
    const result = wf.run('missing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_CHANGE');
    }
  });

  it('creates a bounded plan and executes an approved change', () => {
    const { workflow: wf } = workflow([change({ approved: true })]);
    const result = wf.run('0030');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.plan.steps).toHaveLength(2);
      expect(result.value.execution.every((r) => r.status === 'succeeded')).toBe(true);
      expect(result.value.overridden).toBe(false);
    }
  });

  it('refuses to execute an unapproved change without an override', () => {
    const { workflow: wf } = workflow([change({ approved: false, status: 'proposed' })]);
    const result = wf.run('0030');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_APPROVED');
    }
  });

  it('allows a manual override, recorded explicitly', () => {
    const { workflow: wf } = workflow([change({ approved: false, status: 'proposed' })]);
    const result = wf.run('0030', { manualOverride: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.overridden).toBe(true);
      expect(result.value.review.some && result.value.review.value.reviewer).toBe(
        'manual-override',
      );
    }
  });

  it('captures review evidence with findings when a step fails', () => {
    const { workflow: wf, reviewLog } = workflow([change()], failingAt(1));
    const result = wf.run('0030');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.review.some && result.value.review.value.approved).toBe(false);
      expect(result.value.review.some && result.value.review.value.findings).toHaveLength(1);
    }
    expect(reviewLog.latestFor('0030').some).toBe(true);
  });

  it('propagates a bounded-plan error (empty plan)', () => {
    const { workflow: wf } = workflow([change({ steps: [] })]);
    const result = wf.run('0030');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EMPTY_PLAN');
    }
  });
});
