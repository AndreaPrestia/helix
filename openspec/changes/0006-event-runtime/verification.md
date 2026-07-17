# Verification: In-memory event runtime

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
# exit 0, no findings

$ corepack pnpm typecheck
> tsc -p tsconfig.json --noEmit && turbo run typecheck
@helix/core:typecheck ✓   @helix/events:typecheck ✓
 Tasks:    3 successful, 3 total

$ corepack pnpm test
> vitest run
 ✓ packages/events/src/event-bus.test.ts (10)
 ✓ packages/events/src/event-log.test.ts (3)
 ... (all core + architecture + bootstrap suites)
 Test Files  21 passed (21)
      Tests  113 passed (113)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 Test Files  3 passed (3)
      Tests  22 passed (22)
# @helix/events -> @helix/core is an allowed, non-deep edge; graph stays acyclic

$ corepack pnpm build
> turbo run build
@helix/core:build  ESM 15.86 KB / DTS 17.11 KB
@helix/events:build ESM 3.21 KB / DTS 4.10 KB
 Tasks:    2 successful, 2 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`runtime/event-runtime`) | Implementation | Test evidence |
|---|---|---|
| event envelope | `events/src/envelope.ts` (`EventEnvelope`) | `event-bus.test.ts`, `event-log.test.ts` |
| correlation and causation | `envelope.ts` + `event-bus.ts` publish metadata | `event-bus.test.ts` (defaults + explicit propagation) |
| sync and async handlers | `event-bus.ts` `EventHandler` awaited dispatch | `event-bus.test.ts` (sync+async order) |
| wildcard subscriptions | `event-bus.ts` `WILDCARD` / `subscribeAll` | `event-bus.test.ts` (specific-then-wildcard, `WILDCARD`) |
| ordered replay | `event-log.ts` `replay`, `event-bus.ts` `recorded`/`replay` | `event-log.test.ts`, `event-bus.test.ts` (ordered + afterSequence) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (113).
- [x] Architecture rules pass; `@helix/events` is declared, public-entry-only, imports `@helix/core` through its public entry (allowed edge), and the graph stays acyclic.
- [x] No unapproved dependency introduced. (`@helix/events` adds only `tsup` (frozen build tool) and a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/events`** — declared in the enforced
  `package-dependency-rules.json` (`events → @helix/core`); ADR-0011 and ADR-0016.
- **Scope boundary:** this change delivers the in-memory runtime only — envelope,
  correlation/causation, sync/async dispatch, wildcard subscriptions, and ordered
  replay. Durable persistence and optimistic-append (`0007`), snapshots (`0008`),
  and the durable outbox (`0009`) are explicitly out of scope.
- **Explicit failure (Article 7):** `publish` returns a `Result`; handler failures
  surface as a typed `HandlerDispatchError` (all handlers still run; the event is
  still recorded because it occurred).
- **Tooling:** the root `vitest.config.ts` now aliases `@helix/core` to its source
  so cross-package tests run against source without requiring a prior build; per-
  package `typecheck` resolves `@helix/core` via Turborepo's `^build` dependency.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
