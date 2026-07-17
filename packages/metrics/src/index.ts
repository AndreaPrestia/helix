/**
 * `@helix/metrics` — the engineering-metrics engine.
 *
 * Computes specification and decision coverage, knowledge freshness,
 * architecture drift, and a composite AI-readiness score deterministically from
 * plain input data. Depends only on `@helix/core`, so it never couples to the
 * aggregates that produce its inputs.
 */

export { MetricsValidationError } from './errors.js';
export {
  type CoverageInput,
  type CoverageMetric,
  type FreshnessRecord,
  type FreshnessMetric,
  type DriftInput,
  type DriftMetric,
  type MetricsInput,
  type ReadinessGrade,
  type AiReadinessMetric,
  type MetricsReport,
} from './model.js';
export { MetricsEngine } from './metrics-engine.js';
