import type { Option } from '@helix/core';

/** A summary of one of Helix's own changes, read from its specifications. */
export interface ChangeSummary {
  readonly id: string;
  readonly status: string;
  /** Whether the change is approved for execution. */
  readonly approved: boolean;
  /** The change's task descriptions, used as candidate plan steps. */
  readonly steps: readonly string[];
}

/** A single step in a bounded execution plan. */
export interface PlanStep {
  readonly index: number;
  readonly description: string;
}

/** A bounded plan for a single change. */
export interface BoundedPlan {
  readonly changeId: string;
  readonly steps: readonly PlanStep[];
  readonly maxSteps: number;
}

/** The outcome of executing a single step. */
export type StepStatus = 'succeeded' | 'failed' | 'skipped';

/** A record of executing (or skipping) one plan step. */
export interface ExecutionRecord {
  readonly index: number;
  readonly description: string;
  readonly status: StepStatus;
  readonly detail?: string;
}

/** Captured review evidence for a change. */
export interface ReviewEvidence {
  readonly changeId: string;
  readonly reviewer: string;
  readonly approved: boolean;
  readonly findings: readonly string[];
}

/** The report produced by running the self-hosting workflow for a change. */
export interface SelfHostingReport {
  readonly changeId: string;
  readonly approved: boolean;
  /** Whether execution proceeded under a manual override rather than approval. */
  readonly overridden: boolean;
  readonly plan: BoundedPlan;
  readonly execution: readonly ExecutionRecord[];
  readonly review: Option<ReviewEvidence>;
}

/** Reads Helix's own changes from its specifications. */
export interface SpecReader {
  changes(): readonly ChangeSummary[];
  change(id: string): Option<ChangeSummary>;
}

/** Executes an approved change's plan steps (the Claude/agent boundary). */
export interface ChangeExecutor {
  execute(changeId: string, step: PlanStep): ExecutionRecord;
}
