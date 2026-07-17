import { describe, expect, it } from 'vitest';
import { allow, deny, type Policy } from './policy.js';
import { QualityGate } from './quality-gate.js';
import { isValidWaiver, type Waiver } from './waiver.js';

interface Context {
  readonly coverage: number;
  readonly hasReview: boolean;
}

const coveragePolicy: Policy<Context> = {
  id: 'min-coverage',
  evaluate: (context) =>
    context.coverage >= 80
      ? allow('min-coverage', { coverage: context.coverage })
      : deny('min-coverage', ['coverage below 80%'], { coverage: context.coverage }),
};

const reviewPolicy: Policy<Context> = {
  id: 'requires-review',
  evaluate: (context) =>
    context.hasReview ? allow('requires-review') : deny('requires-review', ['no review recorded']),
};

const throwingPolicy: Policy<Context> = {
  id: 'unstable',
  evaluate: () => {
    throw new Error('evaluator crashed');
  },
};

describe('policy result builders', () => {
  it('builds allow and deny results with evidence', () => {
    expect(allow('p', { a: 1 })).toEqual({
      policyId: 'p',
      decision: 'allow',
      reasons: [],
      evidence: { a: 1 },
    });
    expect(deny('p', ['nope'])).toMatchObject({ decision: 'deny', reasons: ['nope'] });
  });
});

describe('QualityGate', () => {
  const gate = new QualityGate<Context>('pr-gate', [coveragePolicy, reviewPolicy]);

  it('passes only when every policy allows', () => {
    const report = gate.evaluate({ coverage: 90, hasReview: true });
    expect(report.status).toBe('passed');
    expect(report.deniedPolicies).toEqual([]);
  });

  it('denies by default when any policy denies', () => {
    const report = gate.evaluate({ coverage: 50, hasReview: true });
    expect(report.status).toBe('failed');
    expect(report.deniedPolicies).toEqual(['min-coverage']);
  });

  it('fails safe when a policy throws (deny by default)', () => {
    const unstableGate = new QualityGate<Context>('x', [throwingPolicy]);
    const report = unstableGate.evaluate({ coverage: 100, hasReview: true });
    expect(report.status).toBe('failed');
    expect(report.deniedPolicies).toEqual(['unstable']);
    expect(report.evaluated[0]?.result.reasons[0]).toContain('threw');
  });

  it('produces machine-readable evidence that round-trips through JSON', () => {
    const report = gate.evaluate({ coverage: 90, hasReview: true });
    const roundTripped = JSON.parse(JSON.stringify(report)) as typeof report;
    expect(roundTripped.evaluated[0]?.result.evidence).toEqual({ coverage: 90 });
  });

  describe('waiver workflow', () => {
    const waiver: Waiver = {
      policyId: 'min-coverage',
      reason: 'legacy module, tracked in TICKET-1',
      approvedBy: 'lead@example.com',
    };

    it('passes a gate when a denial is covered by a valid waiver', () => {
      const report = gate.evaluate({ coverage: 50, hasReview: true }, [waiver]);
      expect(report.status).toBe('passed');
      const waived = report.evaluated.find((e) => e.result.policyId === 'min-coverage');
      expect(waived?.waived).toBe(true);
      expect(waived?.waiver).toEqual(waiver);
    });

    it('ignores an invalid waiver (missing approver/reason)', () => {
      const invalid: Waiver = { policyId: 'min-coverage', reason: '', approvedBy: '' };
      expect(isValidWaiver(invalid)).toBe(false);
      const report = gate.evaluate({ coverage: 50, hasReview: true }, [invalid]);
      expect(report.status).toBe('failed');
      expect(report.deniedPolicies).toEqual(['min-coverage']);
    });
  });
});
