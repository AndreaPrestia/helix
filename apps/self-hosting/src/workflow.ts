import { type Result, err, ok } from '@helix/core';
import type { BoundedPlanner } from './bounded-planner.js';
import { NotApprovedError, type SelfHostingError, UnknownChangeError } from './errors.js';
import type {
  ChangeExecutor,
  ExecutionRecord,
  ReviewEvidence,
  SelfHostingReport,
  SpecReader,
} from './model.js';
import type { ReviewLog } from './review-log.js';

/** Options controlling a self-hosting run. */
export interface RunOptions {
  /**
   * Authorize execution of a change that is not approved. The override is
   * explicit and recorded in the report and review evidence; it never happens
   * silently (Constitution Article 8).
   */
  readonly manualOverride?: boolean;
}

/** Dependencies for the self-hosting workflow. */
export interface SelfHostingDeps {
  readonly specs: SpecReader;
  readonly planner: BoundedPlanner;
  readonly executor: ChangeExecutor;
  readonly reviewLog: ReviewLog;
}

/**
 * Orchestrates Helix building Helix: it reads a change from Helix's own specs,
 * creates a bounded plan, executes the plan only for an approved change (or
 * under an explicit manual override), and captures review evidence. Every
 * refusal is explicit and typed; nothing is executed or approved implicitly.
 */
export class SelfHostingWorkflow {
  readonly #specs: SpecReader;
  readonly #planner: BoundedPlanner;
  readonly #executor: ChangeExecutor;
  readonly #reviewLog: ReviewLog;

  constructor(deps: SelfHostingDeps) {
    this.#specs = deps.specs;
    this.#planner = deps.planner;
    this.#executor = deps.executor;
    this.#reviewLog = deps.reviewLog;
  }

  run(changeId: string, options: RunOptions = {}): Result<SelfHostingReport, SelfHostingError> {
    const change = this.#specs.change(changeId);
    if (!change.some) {
      return err(new UnknownChangeError(changeId));
    }

    const plan = this.#planner.plan(changeId, change.value.steps);
    if (!plan.ok) {
      return err(plan.error);
    }

    const approved = change.value.approved;
    const manualOverride = options.manualOverride ?? false;
    if (!approved && !manualOverride) {
      return err(new NotApprovedError(changeId));
    }
    const overridden = !approved && manualOverride;

    const execution: ExecutionRecord[] = plan.value.steps.map((step) =>
      this.#executor.execute(changeId, step),
    );

    const findings = execution
      .filter((record) => record.status === 'failed')
      .map((record) => `step ${record.index} failed: ${record.detail ?? record.description}`);
    const evidence: ReviewEvidence = {
      changeId,
      reviewer: overridden ? 'manual-override' : 'self-hosting',
      approved: findings.length === 0,
      findings,
    };
    this.#reviewLog.capture(evidence);

    return ok({
      changeId,
      approved,
      overridden,
      plan: plan.value,
      execution,
      review: this.#reviewLog.latestFor(changeId),
    });
  }
}
