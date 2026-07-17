/**
 * Input for a coverage metric: how many items exist and how many are covered
 * (e.g. requirements with an implementing node, ADRs referenced by code).
 */
export interface CoverageInput {
  readonly total: number;
  readonly covered: number;
}

/** A coverage metric with a ratio in `[0, 1]`. An empty universe is fully covered. */
export interface CoverageMetric {
  readonly total: number;
  readonly covered: number;
  readonly uncovered: number;
  /** Fraction covered in `[0, 1]`; `1` when `total` is `0`. */
  readonly ratio: number;
}

/** A knowledge article's freshness input. */
export interface FreshnessRecord {
  readonly id: string;
  /** ISO-8601 instant the article was last updated. */
  readonly updatedAt: string;
  /** Maximum age, in whole days, before the article is considered stale. */
  readonly ttlDays: number;
}

/** A knowledge-freshness metric. */
export interface FreshnessMetric {
  readonly total: number;
  readonly fresh: number;
  readonly stale: number;
  /** Fraction fresh in `[0, 1]`; `1` when `total` is `0`. */
  readonly ratio: number;
  /** Ids of stale articles, sorted. */
  readonly staleIds: readonly string[];
}

/** Input for the architecture-drift metric. */
export interface DriftInput {
  /** The number of current architecture-rule violations. */
  readonly violations: number;
  /** The maximum tolerated number of violations (the drift budget). */
  readonly budget: number;
}

/** An architecture-drift metric. */
export interface DriftMetric {
  readonly violations: number;
  readonly budget: number;
  readonly withinBudget: boolean;
  /** Drift severity in `[0, 1]`: `0` is no drift, `1` is at/over budget. */
  readonly severity: number;
}

/** All inputs required to compute an AI-readiness report. */
export interface MetricsInput {
  readonly specification: CoverageInput;
  readonly decisions: CoverageInput;
  readonly knowledge: readonly FreshnessRecord[];
  readonly drift: DriftInput;
}

/** A readiness grade derived from the composite score. */
export type ReadinessGrade = 'A' | 'B' | 'C' | 'D';

/** The composite AI-readiness metric. */
export interface AiReadinessMetric {
  /** Weighted composite score in `[0, 1]`. */
  readonly score: number;
  readonly grade: ReadinessGrade;
  /** The contributing factor scores in `[0, 1]`, for transparency. */
  readonly factors: {
    readonly specificationCoverage: number;
    readonly decisionCoverage: number;
    readonly knowledgeFreshness: number;
    readonly architectureHealth: number;
  };
}

/** A full engineering-metrics report. */
export interface MetricsReport {
  readonly specificationCoverage: CoverageMetric;
  readonly decisionCoverage: CoverageMetric;
  readonly knowledgeFreshness: FreshnessMetric;
  readonly architectureDrift: DriftMetric;
  readonly aiReadiness: AiReadinessMetric;
}
