/**
 * `@helix/planner` — the execution planner.
 *
 * Turns decomposed tasks into a validated, deterministic execution plan: it
 * checks the dependency graph (acyclic, known references), matches steps to
 * available capabilities, annotates risk, orders steps by a deterministic
 * topological sort, and derives a stable plan id (Constitution Articles 3, 7).
 * Depends only on `@helix/core`.
 */

export {
  riskLevels,
  isRiskLevel,
  riskSeverity,
  type RiskLevel,
  type PlanStepInput,
  type PlannedStep,
  type PlanInput,
  type Plan,
} from './model.js';
export { PlannerError, PlanValidationError } from './errors.js';
export { ExecutionPlanner } from './execution-planner.js';
