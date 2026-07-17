import type { Policy, PolicyResult } from './policy.js';
import { type Waiver, isValidWaiver } from './waiver.js';

/** Overall status of a quality gate. */
export type GateStatus = 'passed' | 'failed';

/** A policy result within a gate report, with any applied waiver. */
export interface EvaluatedPolicy {
  readonly result: PolicyResult;
  readonly waived: boolean;
  readonly waiver?: Waiver;
}

/** The machine-readable outcome of evaluating a quality gate. */
export interface GateReport {
  readonly gateId: string;
  readonly status: GateStatus;
  readonly evaluated: readonly EvaluatedPolicy[];
  /** Ids of policies that denied and were not (validly) waived. */
  readonly deniedPolicies: readonly string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Aggregates a set of policies into a single deny-by-default quality gate. The
 * gate passes only when every policy explicitly allows or is covered by a valid
 * waiver; a policy that denies, is unwaived, or throws fails the gate. The
 * report is fully machine-readable (Constitution Articles 8 and 9).
 */
export class QualityGate<Context> {
  readonly #gateId: string;
  readonly #policies: readonly Policy<Context>[];

  constructor(gateId: string, policies: readonly Policy<Context>[]) {
    this.#gateId = gateId;
    this.#policies = policies;
  }

  evaluate(context: Context, waivers: readonly Waiver[] = []): GateReport {
    const waiverById = new Map<string, Waiver>();
    for (const waiver of waivers) {
      if (isValidWaiver(waiver)) {
        waiverById.set(waiver.policyId, waiver);
      }
    }

    const evaluated: EvaluatedPolicy[] = [];
    const deniedPolicies: string[] = [];

    for (const policy of this.#policies) {
      let result: PolicyResult;
      try {
        result = policy.evaluate(context);
      } catch (error) {
        // Fail safe: an erroring policy denies (deny-by-default).
        result = {
          policyId: policy.id,
          decision: 'deny',
          reasons: [`policy evaluation threw: ${errorMessage(error)}`],
          evidence: {},
        };
      }

      if (result.decision === 'allow') {
        evaluated.push({ result, waived: false });
        continue;
      }

      const waiver = waiverById.get(policy.id);
      if (waiver !== undefined) {
        evaluated.push({ result, waived: true, waiver });
      } else {
        evaluated.push({ result, waived: false });
        deniedPolicies.push(policy.id);
      }
    }

    return {
      gateId: this.#gateId,
      status: deniedPolicies.length === 0 ? 'passed' : 'failed',
      evaluated,
      deniedPolicies,
    };
  }
}
