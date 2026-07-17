# Verification: Policy and quality gates

## Environment

- OS: Windows
- Node.js: v22.19.0
- Package manager: pnpm 9.15.0 via Corepack (`corepack pnpm`)
- Date: 2026-07-17

## Command evidence

```text
$ corepack pnpm format:check
> prettier --check .
All matched files use Prettier code style!

$ corepack pnpm lint
> eslint .
LINT=0

$ corepack pnpm typecheck
> tsc -p tsconfig.json --noEmit && turbo run typecheck
 Tasks:    4 successful, 4 total

$ corepack pnpm test
> vitest run
 ✓ packages/governance/src/policy/quality-gate.test.ts
 ... (all core + events + governance + architecture + bootstrap suites)
 Test Files  31 passed (31)
      Tests  173 passed (173)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    3 successful, 3 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`governance/policy-engine`) | Implementation | Test evidence |
|---|---|---|
| policy contracts | `policy/policy.ts` (`Policy`, `PolicyResult`, `allow`/`deny`) | `quality-gate.test.ts` |
| deny by default | `policy/quality-gate.ts` — gate passes only if every policy allows; throwing policies deny | `quality-gate.test.ts` (denial + fail-safe throw) |
| machine-readable evidence | `PolicyResult.evidence` / `GateReport` (plain serializable objects) | `quality-gate.test.ts` (JSON round-trip) |
| gate aggregation | `QualityGate.evaluate` aggregates policy results into a `GateReport` | `quality-gate.test.ts` |
| waiver workflow | `policy/waiver.ts` (`Waiver`, `isValidWaiver`) + gate application | `quality-gate.test.ts` (valid waiver passes; invalid ignored) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (173).
- [x] Architecture rules pass; `@helix/governance` stays declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/governance`** — the spec lives under
  `governance/policy-engine` and `platform-planes.md` places policies and gates in
  the Governance Engine. Added as a `policy/` submodule; no new package (avoids the
  `0002` declared-responsibilities issue and keeps the governance plane cohesive).
- **Deny-by-default (Article 8):** a gate passes only when every policy explicitly
  allows or is covered by a valid waiver; a denying, unwaived, or throwing policy
  fails the gate. Policies return explicit `PolicyResult`s and never throw to
  signal denial (a thrown evaluator is treated as a fail-safe deny).
- **Auditable waivers (Article 8):** waivers must name an approver and a non-empty
  reason (`isValidWaiver`); invalid waivers are ignored and the denial stands.
- **Machine-readable evidence (Articles 6/9):** `PolicyResult` and `GateReport`
  are plain serializable objects (verified via a JSON round-trip test).

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
