# Verification: Execution planner

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
 Tasks:    10 successful, 10 total

$ corepack pnpm test
> vitest run
 ✓ packages/planner/src/execution-planner.test.ts
 ... (all package + architecture + bootstrap suites)
 Test Files  37 passed (37)
      Tests  223 passed (223)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    8 successful, 8 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`planner/execution-planner`) | Implementation | Test evidence |
|---|---|---|
| task decomposition | `PlanInput`/`PlanStepInput` → validated `PlannedStep`s | `execution-planner.test.ts` |
| dependency graph | deterministic Kahn topological sort; unknown-dep and cycle detection | `execution-planner.test.ts` |
| capability matching | `availableCapabilities` matching + `requiredCapabilities` | `execution-planner.test.ts` |
| risk annotations | per-step `RiskLevel` + `overallRisk` (highest) | `execution-planner.test.ts` |
| deterministic plan identifiers | SHA-256 over canonical goal + ordered steps | `execution-planner.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (223).
- [x] Architecture rules pass; `@helix/planner` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (`node:crypto` for the plan id; `@types/node`/`tsup` dev only.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/planner`** — declared in the enforced
  `package-dependency-rules.json` (`planner → @helix/core, @helix/governance, @helix/context`).
  The planning algorithm is self-contained and depends only on `@helix/core`;
  `@helix/governance` and `@helix/context` are allowed but not required for this
  change (avoids unused dependencies).
- **Determinism (Article 3):** topological order breaks ties by ascending id, and
  the plan id is a SHA-256 of the canonical (goal + ordered steps) via the
  built-in `node:crypto` — no third-party dependency.
- **Explicit failure (Article 7):** all validation issues (duplicate ids, unknown
  dependencies, unmatched capabilities, invalid risk, cycles) are collected and
  reported together via a typed `PlanValidationError`.
- **Capability matching** is optional: when `availableCapabilities` is supplied,
  every step's `requiredCapability` must be in the set; otherwise capabilities are
  recorded without matching.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
