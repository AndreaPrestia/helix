/** Risk levels for a plan step, from lowest to highest. */
export const riskLevels = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof riskLevels)[number];

/** Whether a value is a recognized {@link RiskLevel}. */
export function isRiskLevel(value: string): value is RiskLevel {
  return (riskLevels as readonly string[]).includes(value);
}

/** Numeric severity used to compute the highest risk in a plan. */
export function riskSeverity(level: RiskLevel): number {
  return riskLevels.indexOf(level);
}

/** A raw step supplied to the planner (task decomposition input). */
export interface PlanStepInput {
  readonly id: string;
  readonly description: string;
  /** Ids of steps that must complete before this one. */
  readonly dependsOn: readonly string[];
  /** The capability required to execute this step (e.g. an agent role). */
  readonly requiredCapability: string;
  readonly risk: RiskLevel;
}

/** A validated, normalized plan step. */
export interface PlannedStep {
  readonly id: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
  readonly requiredCapability: string;
  readonly risk: RiskLevel;
}

/** Input to the planner. */
export interface PlanInput {
  readonly goal: string;
  readonly steps: readonly PlanStepInput[];
  /** Optional set of capabilities available for matching. */
  readonly availableCapabilities?: readonly string[];
}

/** A validated execution plan. */
export interface Plan {
  /** Deterministic content id of the plan. */
  readonly id: string;
  readonly goal: string;
  /** Steps in a deterministic topological execution order. */
  readonly steps: readonly PlannedStep[];
  /** Step ids in execution order. */
  readonly order: readonly string[];
  /** Distinct required capabilities, sorted. */
  readonly requiredCapabilities: readonly string[];
  /** The highest risk among the steps. */
  readonly overallRisk: RiskLevel;
}
