import type { Clock } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { MetricsEngine } from './metrics-engine.js';
import type { FreshnessRecord, MetricsInput } from './model.js';

function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}

const NOW = '2026-01-31T00:00:00.000Z';
const engine = () => new MetricsEngine(clockAt(NOW));

describe('specificationCoverage / decisionCoverage', () => {
  it('computes a ratio', () => {
    const result = engine().specificationCoverage({ total: 4, covered: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ total: 4, covered: 3, uncovered: 1, ratio: 0.75 });
    }
  });

  it('treats an empty universe as fully covered', () => {
    const result = engine().decisionCoverage({ total: 0, covered: 0 });
    expect(result.ok && result.value.ratio).toBe(1);
  });

  it('rejects covered greater than total', () => {
    const result = engine().specificationCoverage({ total: 2, covered: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('METRICS_VALIDATION');
    }
  });

  it('rejects negative or non-integer counts', () => {
    expect(engine().specificationCoverage({ total: -1, covered: 0 }).ok).toBe(false);
    expect(engine().specificationCoverage({ total: 2, covered: 1.5 }).ok).toBe(false);
  });
});

describe('knowledgeFreshness', () => {
  const records: readonly FreshnessRecord[] = [
    { id: 'a', updatedAt: '2026-01-30T00:00:00.000Z', ttlDays: 7 }, // age 1 → fresh
    { id: 'b', updatedAt: '2026-01-01T00:00:00.000Z', ttlDays: 7 }, // age 30 → stale
    { id: 'c', updatedAt: '2026-01-24T00:00:00.000Z', ttlDays: 7 }, // age 7 → fresh (boundary)
  ];

  it('classifies fresh and stale articles by age vs ttl', () => {
    const result = engine().knowledgeFreshness(records);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.total).toBe(3);
      expect(result.value.fresh).toBe(2);
      expect(result.value.stale).toBe(1);
      expect(result.value.staleIds).toEqual(['b']);
      expect(result.value.ratio).toBeCloseTo(2 / 3);
    }
  });

  it('treats no articles as fully fresh', () => {
    expect(engine().knowledgeFreshness([]).ok && engine().knowledgeFreshness([]).ok).toBe(true);
    const result = engine().knowledgeFreshness([]);
    expect(result.ok && result.value.ratio).toBe(1);
  });

  it('rejects invalid ttl or timestamp', () => {
    expect(engine().knowledgeFreshness([{ id: 'x', updatedAt: NOW, ttlDays: -1 }]).ok).toBe(false);
    expect(engine().knowledgeFreshness([{ id: 'y', updatedAt: 'not-a-date', ttlDays: 1 }]).ok).toBe(
      false,
    );
  });
});

describe('architectureDrift', () => {
  it('is within budget when violations do not exceed it', () => {
    const result = engine().architectureDrift({ violations: 2, budget: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.withinBudget).toBe(true);
      expect(result.value.severity).toBeCloseTo(0.4);
    }
  });

  it('caps severity at 1 when over budget', () => {
    const result = engine().architectureDrift({ violations: 10, budget: 5 });
    expect(result.ok && result.value.severity).toBe(1);
    expect(result.ok && result.value.withinBudget).toBe(false);
  });

  it('treats any violation as full drift when budget is zero', () => {
    expect(engine().architectureDrift({ violations: 1, budget: 0 }).ok).toBe(true);
    const result = engine().architectureDrift({ violations: 1, budget: 0 });
    expect(result.ok && result.value.severity).toBe(1);
  });

  it('rejects negative inputs', () => {
    expect(engine().architectureDrift({ violations: -1, budget: 5 }).ok).toBe(false);
  });
});

describe('aiReadiness / report', () => {
  const input: MetricsInput = {
    specification: { total: 10, covered: 10 },
    decisions: { total: 10, covered: 10 },
    knowledge: [{ id: 'a', updatedAt: NOW, ttlDays: 30 }],
    drift: { violations: 0, budget: 5 },
  };

  it('grades a perfect input as A with score 1', () => {
    const result = engine().aiReadiness(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBeCloseTo(1);
      expect(result.value.grade).toBe('A');
    }
  });

  it('produces a full report combining every metric', () => {
    const result = engine().report({
      specification: { total: 4, covered: 2 },
      decisions: { total: 4, covered: 1 },
      knowledge: [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z', ttlDays: 7 }],
      drift: { violations: 6, budget: 5 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.specificationCoverage.ratio).toBe(0.5);
      expect(result.value.decisionCoverage.ratio).toBe(0.25);
      expect(result.value.knowledgeFreshness.ratio).toBe(0);
      expect(result.value.architectureDrift.withinBudget).toBe(false);
      expect(result.value.aiReadiness.grade).toBe('D');
    }
  });

  it('propagates a validation error from any factor', () => {
    const result = engine().report({ ...input, specification: { total: 1, covered: 5 } });
    expect(result.ok).toBe(false);
  });

  it('weights factors deterministically', () => {
    const result = engine().report({
      specification: { total: 1, covered: 1 }, // 1.0 * 0.3
      decisions: { total: 1, covered: 0 }, // 0.0 * 0.2
      knowledge: [], // 1.0 * 0.2
      drift: { violations: 5, budget: 5 }, // health 0 * 0.3
    });
    expect(result.ok && result.value.aiReadiness.score).toBeCloseTo(0.5);
    expect(result.ok && result.value.aiReadiness.grade).toBe('D');
  });
});
