# Verification: Engineering metrics

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 20 successful, 20 total   EXIT=0
corepack pnpm test                          Test Files 58 passed (58) / Tests 425 passed (425)   TEST=0
corepack pnpm architecture:test             Test Files 3 passed (3) / Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 15 successful, 15 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0
```

## Requirement → evidence (metrics/engineering-metrics)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| specification coverage | `packages/metrics/src/metrics-engine.ts` — `MetricsEngine.specificationCoverage` (ratio, empty=1, validation) | `metrics-engine.test.ts` "computes a ratio", "treats an empty universe as fully covered", covered>total / negative / non-integer rejections |
| decision coverage | `MetricsEngine.decisionCoverage` (same coverage computation over ADR references) | `metrics-engine.test.ts` "treats an empty universe as fully covered"; report decisions ratio |
| knowledge freshness | `MetricsEngine.knowledgeFreshness` — age vs TTL using injected `Clock`; sorted stale ids; invalid ttl/timestamp rejected | `metrics-engine.test.ts` "classifies fresh and stale…", "treats no articles as fully fresh", "rejects invalid ttl or timestamp" |
| architecture drift | `MetricsEngine.architectureDrift` — violations vs budget, bounded severity `[0,1]`, `withinBudget` | `metrics-engine.test.ts` within-budget, over-budget cap, zero-budget, negative rejection |
| AI readiness | `MetricsEngine.aiReadiness`/`report` — deterministic weighted composite (spec 0.3, decisions 0.2, freshness 0.2, architecture health 0.3) + grade | `metrics-engine.test.ts` "grades a perfect input as A", "produces a full report…", "propagates a validation error", "weights factors deterministically" |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **Library package, not an app.** `metrics` is a declared library package in
  `package-dependency-rules.json`; this change adds `packages/metrics` (`@helix/metrics`)
  accordingly, satisfying the declared-responsibilities and allowed-dependency gates.
- **Decoupled from input-producing aggregates.** The ruleset allows `metrics` to depend on
  `@helix/core` and `@helix/events` only; it may not import `governance`/`repository`/
  `knowledge`. The engine therefore consumes plain input DTOs (`CoverageInput`,
  `FreshnessRecord`, `DriftInput`) rather than those aggregates. The shipped package depends
  on `@helix/core` only (a subset of the allowance); the composition layer that adapts real
  aggregate data into these inputs is a later concern.
- **Deterministic time via `Clock`.** Knowledge freshness uses the injected `@helix/core`
  `Clock` port, keeping age computation deterministic and testable (Constitution Article 3).

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
