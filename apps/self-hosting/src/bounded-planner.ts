import { type Result, err, ok } from '@helix/core';
import { EmptyPlanError, PlanTooLargeError } from './errors.js';
import type { BoundedPlan, PlanStep } from './model.js';

/** The default maximum number of steps a self-hosting plan may contain. */
export const DEFAULT_MAX_PLAN_STEPS = 20;

/**
 * Builds bounded execution plans. A plan is explicitly capped at `maxSteps` so
 * self-hosting stays within a single, reviewable change scope; a plan that is
 * empty or exceeds the budget is rejected rather than truncated (Constitution
 * Article 7 — no silently narrowed scope).
 */
export class BoundedPlanner {
  readonly #maxSteps: number;

  constructor(maxSteps: number = DEFAULT_MAX_PLAN_STEPS) {
    this.#maxSteps = maxSteps;
  }

  /** The configured step budget. */
  get maxSteps(): number {
    return this.#maxSteps;
  }

  /** Build a bounded plan for a change from its candidate step descriptions. */
  plan(
    changeId: string,
    stepDescriptions: readonly string[],
  ): Result<BoundedPlan, EmptyPlanError | PlanTooLargeError> {
    const descriptions = stepDescriptions.map((text) => text.trim()).filter((text) => text !== '');
    if (descriptions.length === 0) {
      return err(new EmptyPlanError(changeId));
    }
    if (descriptions.length > this.#maxSteps) {
      return err(new PlanTooLargeError(changeId, descriptions.length, this.#maxSteps));
    }
    const steps: PlanStep[] = descriptions.map((description, index) => ({ index, description }));
    return ok({ changeId, steps, maxSteps: this.#maxSteps });
  }
}
