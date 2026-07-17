import { describe, expect, it } from 'vitest';
import { readYaml } from '../support/repo.js';

interface WorkflowStep {
  readonly name?: string;
  readonly run?: string;
  readonly uses?: string;
}

interface WorkflowJob {
  readonly 'runs-on'?: string;
  readonly steps?: readonly WorkflowStep[];
}

interface Workflow {
  readonly name?: string;
  readonly jobs?: Record<string, WorkflowJob>;
}

describe('GitHub Actions CI', () => {
  const workflow = readYaml<Workflow>('.github/workflows/ci.yml');
  const job = workflow.jobs?.['quality-gates'];
  const runCommands = (job?.steps ?? [])
    .map((step) => step.run)
    .filter((run): run is string => typeof run === 'string');

  it('defines a quality-gates job on a Linux runner', () => {
    expect(job).toBeDefined();
    expect(job?.['runs-on']).toBe('ubuntu-latest');
  });

  it('runs every mandatory quality gate in verification order', () => {
    const expectedOrder = [
      'pnpm install --frozen-lockfile',
      'pnpm format:check',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
      'pnpm architecture:test',
      'pnpm build',
    ];

    const indices = expectedOrder.map((gate) => runCommands.findIndex((cmd) => cmd.includes(gate)));

    for (let i = 0; i < expectedOrder.length; i += 1) {
      expect(indices[i], `gate "${expectedOrder[i]}" must be present`).toBeGreaterThanOrEqual(0);
    }

    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });
});
