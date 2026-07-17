# Verification: Review engine

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
 Tasks:    13 successful, 13 total

$ corepack pnpm test
> vitest run
 ✓ packages/review/src/review.test.ts
 ... (all package + architecture + bootstrap suites)
 Test Files  42 passed (42)
      Tests  271 passed (271)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    11 successful, 11 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`review/review-engine`) | Implementation | Test evidence |
|---|---|---|
| review contracts | `Review` aggregate + `model.ts` types | `review.test.ts` |
| independent reviewer context | `Review.open` enforces reviewer ≠ author | `review.test.ts` |
| findings severity | `FindingSeverity` (`info`/`minor`/`major`/`blocking`) + `addFinding` | `review.test.ts` |
| approval rules | `approve` blocked by `ApprovalPolicy.blockingSeverities` (default `blocking`) | `review.test.ts` |
| rework loop | `requestChanges` → `resubmit` (fresh round, cleared findings) | `review.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (271).
- [x] Architecture rules pass; `@helix/review` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/review`** — declared in the enforced
  `package-dependency-rules.json` (`review → @helix/core, @helix/governance`).
  Approval logic is self-contained, so this change depends only on `@helix/core`;
  `@helix/governance` is allowed but not required (avoids an unused dependency).
- **Independent reviewer (self-review prevention):** `Review.open` rejects a
  reviewer equal to the author with a typed `ReviewerIndependenceError`.
- **Deny-by-default approval (Article 8):** approval is blocked while any finding
  of a policy-blocking severity is open (default: `blocking`); the blocking
  finding ids are reported in `ApprovalBlockedError`.
- **Rework loop:** `requestChanges` (requires ≥1 finding) → `resubmit` starts a
  fresh review round with cleared findings and an incremented round counter.
- **Explicit failure (Article 7):** all state-incompatible operations and invalid
  inputs return typed `ReviewError`s; ids come from an injected `IdGenerator`
  (determinism, Article 3).

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
