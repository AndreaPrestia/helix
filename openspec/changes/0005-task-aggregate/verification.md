# Verification: Task aggregate

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
 Tasks:    1 successful, 1 total

$ corepack pnpm test
> vitest run
 ✓ packages/core/src/task/status.test.ts (5)
 ✓ packages/core/src/task/task.test.ts (12)
 ... (all core + architecture + bootstrap suites)
 Test Files  19 passed (19)
      Tests  100 passed (100)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 Test Files  3 passed (3)
      Tests  22 passed (22)
# @helix/core still conforms after adding the task aggregate

$ corepack pnpm build
> turbo run build
@helix/core:build: ESM dist\index.js 15.86 KB
@helix/core:build: DTS dist\index.d.ts 17.11 KB
 Tasks:    1 successful, 1 total
```

## Requirement → evidence mapping

| Requirement (`domain/task-aggregate`) | Implementation | Test evidence |
|---|---|---|
| lifecycle state machine | `task/status.ts`, `task/task.ts` | `task.test.ts` (happy path + illegal transition), `status.test.ts` |
| blocking and cancellation | `task.ts` `block` / `unblock` / `cancel` | `task.test.ts` (block+reason, unblock, cancel+reason, guards) |
| approval and completion | `task.ts` `submitForReview` / `complete` | `task.test.ts` (review→completed) |
| domain events | `task/events.ts`; events raised on every transition | `task.test.ts` (ordered events, block/cancel payloads, determinism) |
| rehydration and snapshots | `task.ts` `toSnapshot` / `fromSnapshot`, `snapshot.ts` | `task.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (100).
- [x] Architecture rules pass; `@helix/core` remains declared, public-entry-only, acyclic, and domain-isolated.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and assumptions

- **Placement in `@helix/core`** — same rationale as the specification aggregate
  (ADR-0014/0015; the enforced ruleset has no separate package for domain
  aggregates).
- **State-machine reconciliation (documented assumption, needs reviewer sign-off):**
  the frozen `state-machines.md` lists the Task states as
  `draft → ready → in_progress → blocked → review → completed`. All those states
  are implemented. `blocked` is modeled as a **recoverable side-state** of
  `in_progress` (`in_progress ↔ blocked`) rather than a mandatory linear stage,
  and `in_progress → review` is permitted directly, because a strictly-linear
  reading would make `review` reachable only through `blocked` (nonsensical). A
  terminal `cancelled` state and `<any non-terminal> → cancelled` transitions were
  added because the "blocking and cancellation" requirement mandates cancellation
  but the diagram lists no such state. These are the minimal additions needed to
  satisfy the normative requirements coherently.
- **`block`/`cancel` require a non-empty reason**, recorded in the event payload
  for observability (Constitution Article 7).
- **Determinism** proven with a fixed clock and sequential id generator (Article 3).

## Residual risks

- The state-machine reconciliation above should be confirmed by a reviewer; if the
  intended model differs, it is a spec/`state-machines.md` clarification.
- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
