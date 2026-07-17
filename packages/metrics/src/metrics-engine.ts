import { type Clock, type Result, err, ok } from '@helix/core';
import { MetricsValidationError } from './errors.js';
import type {
  AiReadinessMetric,
  CoverageInput,
  CoverageMetric,
  DriftInput,
  DriftMetric,
  FreshnessMetric,
  FreshnessRecord,
  MetricsInput,
  MetricsReport,
  ReadinessGrade,
} from './model.js';

const MILLIS_PER_DAY = 86_400_000;

/** Relative weights of each factor in the composite AI-readiness score. */
const READINESS_WEIGHTS = {
  specificationCoverage: 0.3,
  decisionCoverage: 0.2,
  knowledgeFreshness: 0.2,
  architectureHealth: 0.3,
} as const;

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function grade(score: number): ReadinessGrade {
  if (score >= 0.9) return 'A';
  if (score >= 0.75) return 'B';
  if (score >= 0.6) return 'C';
  return 'D';
}

function coverageMetric(input: CoverageInput): CoverageMetric {
  const ratio = input.total === 0 ? 1 : input.covered / input.total;
  return {
    total: input.total,
    covered: input.covered,
    uncovered: input.total - input.covered,
    ratio,
  };
}

/**
 * Computes engineering metrics deterministically from plain input data:
 * specification and decision coverage, knowledge freshness, architecture drift,
 * and a composite AI-readiness score. The engine depends only on `@helix/core`
 * (and its `Clock` for freshness), so it never couples to the aggregates that
 * produce its inputs. Every metric validates its input and reports issues
 * explicitly rather than silently coercing (Constitution Article 7).
 */
export class MetricsEngine {
  readonly #clock: Clock;

  constructor(clock: Clock) {
    this.#clock = clock;
  }

  /** Fraction of specification requirements that are implemented. */
  specificationCoverage(input: CoverageInput): Result<CoverageMetric, MetricsValidationError> {
    return this.#coverage('specification', input);
  }

  /** Fraction of architecture decisions (ADRs) that are referenced. */
  decisionCoverage(input: CoverageInput): Result<CoverageMetric, MetricsValidationError> {
    return this.#coverage('decisions', input);
  }

  /** Fraction of knowledge articles that are still fresh (age within TTL). */
  knowledgeFreshness(
    records: readonly FreshnessRecord[],
  ): Result<FreshnessMetric, MetricsValidationError> {
    const issues: string[] = [];
    const now = this.#clock.now().getTime();
    const staleIds: string[] = [];
    let fresh = 0;

    for (const record of records) {
      if (!isNonNegativeInteger(record.ttlDays)) {
        issues.push(`article "${record.id}" has an invalid ttlDays`);
        continue;
      }
      const updated = Date.parse(record.updatedAt);
      if (Number.isNaN(updated)) {
        issues.push(`article "${record.id}" has an invalid updatedAt`);
        continue;
      }
      const ageDays = Math.floor((now - updated) / MILLIS_PER_DAY);
      if (ageDays <= record.ttlDays) {
        fresh += 1;
      } else {
        staleIds.push(record.id);
      }
    }

    if (issues.length > 0) {
      return err(new MetricsValidationError(issues));
    }

    const total = records.length;
    return ok({
      total,
      fresh,
      stale: staleIds.length,
      ratio: total === 0 ? 1 : fresh / total,
      staleIds: [...staleIds].sort((a, b) => a.localeCompare(b)),
    });
  }

  /** Architecture drift relative to a tolerated violation budget. */
  architectureDrift(input: DriftInput): Result<DriftMetric, MetricsValidationError> {
    const issues: string[] = [];
    if (!isNonNegativeInteger(input.violations)) {
      issues.push('violations must be a non-negative integer');
    }
    if (!isNonNegativeInteger(input.budget)) {
      issues.push('budget must be a non-negative integer');
    }
    if (issues.length > 0) {
      return err(new MetricsValidationError(issues));
    }

    const severity =
      input.budget === 0
        ? input.violations > 0
          ? 1
          : 0
        : Math.min(1, input.violations / input.budget);
    return ok({
      violations: input.violations,
      budget: input.budget,
      withinBudget: input.violations <= input.budget,
      severity,
    });
  }

  /** The composite AI-readiness metric derived from all other metrics. */
  aiReadiness(input: MetricsInput): Result<AiReadinessMetric, MetricsValidationError> {
    const report = this.report(input);
    return report.ok ? ok(report.value.aiReadiness) : err(report.error);
  }

  /** A full metrics report; fails if any input is invalid. */
  report(input: MetricsInput): Result<MetricsReport, MetricsValidationError> {
    const specification = this.specificationCoverage(input.specification);
    if (!specification.ok) return err(specification.error);
    const decisions = this.decisionCoverage(input.decisions);
    if (!decisions.ok) return err(decisions.error);
    const knowledge = this.knowledgeFreshness(input.knowledge);
    if (!knowledge.ok) return err(knowledge.error);
    const drift = this.architectureDrift(input.drift);
    if (!drift.ok) return err(drift.error);

    const factors = {
      specificationCoverage: specification.value.ratio,
      decisionCoverage: decisions.value.ratio,
      knowledgeFreshness: knowledge.value.ratio,
      architectureHealth: 1 - drift.value.severity,
    };
    const score =
      factors.specificationCoverage * READINESS_WEIGHTS.specificationCoverage +
      factors.decisionCoverage * READINESS_WEIGHTS.decisionCoverage +
      factors.knowledgeFreshness * READINESS_WEIGHTS.knowledgeFreshness +
      factors.architectureHealth * READINESS_WEIGHTS.architectureHealth;

    return ok({
      specificationCoverage: specification.value,
      decisionCoverage: decisions.value,
      knowledgeFreshness: knowledge.value,
      architectureDrift: drift.value,
      aiReadiness: { score, grade: grade(score), factors },
    });
  }

  #coverage(label: string, input: CoverageInput): Result<CoverageMetric, MetricsValidationError> {
    const issues: string[] = [];
    if (!isNonNegativeInteger(input.total)) {
      issues.push(`${label} total must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(input.covered)) {
      issues.push(`${label} covered must be a non-negative integer`);
    }
    if (issues.length === 0 && input.covered > input.total) {
      issues.push(`${label} covered (${input.covered}) exceeds total (${input.total})`);
    }
    if (issues.length > 0) {
      return err(new MetricsValidationError(issues));
    }
    return ok(coverageMetric(input));
  }
}
