/** A policy decision: explicit allow or deny. */
export type PolicyDecision = 'allow' | 'deny';

/**
 * The machine-readable outcome of evaluating a single policy. `evidence` is a
 * serializable record supporting auditable, traceable governance (Constitution
 * Articles 6 and 9).
 */
export interface PolicyResult {
  readonly policyId: string;
  readonly decision: PolicyDecision;
  readonly reasons: readonly string[];
  readonly evidence: Readonly<Record<string, unknown>>;
}

/**
 * A policy evaluated deterministically against a context. Policies never throw
 * to signal denial; they return an explicit {@link PolicyResult}.
 */
export interface Policy<Context> {
  readonly id: string;
  evaluate(context: Context): PolicyResult;
}

/** Build an `allow` result. */
export function allow(
  policyId: string,
  evidence: Readonly<Record<string, unknown>> = {},
): PolicyResult {
  return { policyId, decision: 'allow', reasons: [], evidence };
}

/** Build a `deny` result with the reasons for denial. */
export function deny(
  policyId: string,
  reasons: readonly string[],
  evidence: Readonly<Record<string, unknown>> = {},
): PolicyResult {
  return { policyId, decision: 'deny', reasons, evidence };
}
