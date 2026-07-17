# Verification: Durable dispatch and outbox

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
LINT_EXIT=0

$ corepack pnpm typecheck
> tsc -p tsconfig.json --noEmit && turbo run typecheck
 Tasks:    3 successful, 3 total

$ corepack pnpm test
> vitest run
 ✓ packages/events/src/outbox/dispatcher.test.ts (4)
 ✓ packages/events/src/outbox/unit-of-work.test.ts (4)
 ... (all core + events + architecture + bootstrap suites)
 Test Files  27 passed (27)
      Tests  144 passed (144)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    2 successful, 2 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`runtime/outbox`) | Implementation | Test evidence |
|---|---|---|
| post-commit outbox records | `outbox/unit-of-work.ts` (`UnitOfWork.commit` enqueues after a successful append) | `unit-of-work.test.ts` |
| idempotent dispatch | `outbox/in-memory-outbox-store.ts` (enqueue keyed by event id); `dispatcher.ts` only processes `pending` | `dispatcher.test.ts` (idempotent enqueue; no redelivery) |
| retry policy | `dispatcher.ts` `RetryPolicy` / `defaultRetryPolicy` | `dispatcher.test.ts` (retry then dead-letter) |
| dead-letter records | `dispatcher.ts` moves records to `dead_letter` after `maxAttempts` | `dispatcher.test.ts` |
| replay tooling | `dispatcher.ts` `replayDeadLetters` | `dispatcher.test.ts` (replay then dispatch) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (144).
- [x] Architecture rules pass; `@helix/events` stays declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/events`** — the outbox and unit of work coordinate the
  event store (0007) and snapshots (0008), all of which live here.
- **Unit of work (ADR-0019/0026/0027):** `commit` atomically appends tracked
  streams; only after a successful append does it write post-commit outbox
  records and optionally materialize a snapshot. It returns a structured
  `CommitResult` — a successful append is never reported as failed because a
  derived snapshot failed; snapshot failures are surfaced as explicit, retryable
  `snapshotFailures` (ADR-0027).
- **Explicit dispatch outcomes (Article 7):** `dispatchPending` returns a
  `DispatchReport` (dispatched / retryable / deadLettered); failures are recorded
  on the record (`attempts`, `lastError`) and never hidden.
- **Idempotency** is by event id at enqueue time and by only ever dispatching
  `pending` records, so a record is never redelivered after success.
- **Scope:** in-memory `OutboxStore` reference implementation only; a durable
  outbox adapter can be added later using the same port (the durable event store
  from 0007 already provides the authoritative record).

## Residual risks

- No durable outbox adapter yet (in-memory only), by scope.
- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
