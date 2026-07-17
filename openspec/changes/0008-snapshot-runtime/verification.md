# Verification: Snapshot runtime

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
 Tasks:    3 successful, 3 total

$ corepack pnpm test
> vitest run
 ✓ packages/events/src/snapshot/policy.test.ts (3)
 ✓ packages/events/src/snapshot/snapshot-repository.test.ts (7)
 ... (all core + events + architecture + bootstrap suites)
 Test Files  25 passed (25)
      Tests  136 passed (136)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)
# @helix/events still imports only @helix/core; graph acyclic

$ corepack pnpm build
> turbo run build
 Tasks:    2 successful, 2 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`runtime/snapshots`) | Implementation | Test evidence |
|---|---|---|
| snapshot store port | `snapshot/snapshot-store.ts` (`SnapshotStore`, `AggregateSnapshot`), `in-memory-snapshot-store.ts` | `snapshot-repository.test.ts` |
| optional optimization | `snapshot-repository.ts` — event stream authoritative; snapshot only accelerates | `snapshot-repository.test.ts` (snapshot + later events; replay-only policy) |
| snapshot policies | `snapshot/policy.ts` (`interval`, `minVersion`, `rebuildOnFallback`) | `policy.test.ts` |
| fallback to full replay | `snapshot-repository.ts` `load` — missing/corrupt/incompatible → replay, reason observable | `snapshot-repository.test.ts` (missing, incompatible, corrupt) |
| repair and rebuild | `snapshot-repository.ts` `rebuild` + `rebuildOnFallback` repair | `snapshot-repository.test.ts` (corruption repair, rebuild) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (136).
- [x] Architecture rules pass; `@helix/events` stays declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/events`** alongside the event store — the snapshot
  runtime is a durable-runtime concern; ADR-0023 ties snapshot-aware
  repositories to the event stream, which lives here.
- **Generic, decoupled runtime:** `SnapshotRepository<State>` is parameterized by
  an `AggregateCodec` the composition root supplies, so the runtime never depends
  on specific aggregates. Domain aggregates own snapshot state conversion
  (ADR-0023); cadence/min-version/repair are application policy outside the domain
  (ADR-0025/0028).
- **Snapshots are optional optimizations (ADR-0022):** the event stream is always
  authoritative; a snapshot only provides a starting point and is disposable.
- **Explicit failure (ADR-0024, Article 7):** missing/corrupt/incompatible
  snapshots never block loading — the repository falls back to full replay and the
  `fallbackReason` is observable; snapshot-store write failures surface as a typed
  error rather than silent success.
- **Scope:** in-memory `SnapshotStore` reference implementation only; the spec does
  not require a durable snapshot adapter for this change (a JSONL/durable snapshot
  store can be added later using the same port).

## Residual risks

- No durable snapshot adapter yet (in-memory only) — acceptable per this change's
  scope; snapshots are rebuildable from the (durable) event stream regardless.
- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
