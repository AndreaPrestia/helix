# Verification: Durable event persistence

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
 Tasks:    3 successful, 3 total   (@helix/core, @helix/events)

$ corepack pnpm test
> vitest run
 ✓ packages/events/src/store/in-memory-event-store.test.ts (7)
 ✓ packages/events/src/store/jsonl-event-store.test.ts (7)
 ... (all core + events + architecture + bootstrap suites)
 Test Files  23 passed (23)
      Tests  126 passed (126)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 Test Files  3 passed (3)
      Tests  22 passed (22)
# @helix/events still imports only @helix/core (public entry); graph acyclic

$ corepack pnpm build
> turbo run build
 Tasks:    2 successful, 2 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`runtime/event-persistence`) | Implementation | Test evidence |
|---|---|---|
| event store port | `events/src/store/event-store.ts` (`EventStore`, `StoredEvent`, `StreamWrite`) | both store test suites |
| optimistic concurrency | `stage.ts` per-stream expected-version check → `ConcurrencyError` | `*-event-store.test.ts` (stale version) |
| atomic multi-stream append | `stage.ts` validate-before-commit; `appendToStreams` | `*-event-store.test.ts` (nothing written on conflict) |
| JSONL adapter | `events/src/store/jsonl-event-store.ts` | `jsonl-event-store.test.ts` (durability across instances, readAll order) |
| recovery and corruption handling | `jsonl-event-store.ts` explicit `StoreCorruptionError`; empty-line recovery; ENOENT → empty | `jsonl-event-store.test.ts` (malformed line, missing stream) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (126).
- [x] Architecture rules pass; `@helix/events` stays declared, public-entry-only, acyclic, and imports only `@helix/core`.
- [x] No unapproved dependency introduced. (`@helix/events` adds only `@types/node` (dev types for the mandated Node 22 runtime); `tsup` already present.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/events`.** The enforced `package-dependency-rules.json`
  has no separate persistence/infrastructure package; ADR-0016 states durable
  stores "implement the same ports in later releases" within the event runtime.
  A separate package would fail the `0002` declared-responsibilities gate and
  require editing frozen reference data. `@helix/events` is not the isolated core,
  so it may use Node built-ins (`node:fs/promises`, `node:path`).
- **Scope boundary:** event store port + optimistic concurrency + atomic
  multi-stream append + JSONL adapter + corruption handling only. Snapshots
  (`0008`) and the durable outbox / unit-of-work dispatch (`0009`) are out of scope.
- **Explicit failure (Article 7):** all store operations return a `Result` with
  typed `EventStoreError` subclasses (`ConcurrencyError`, `InvalidStreamIdError`,
  `StoreCorruptionError`); corruption is reported, never silently skipped.
- **JSONL atomicity caveat:** multi-stream append validates all expected versions
  against a consistent on-disk snapshot before writing (optimistic-concurrency
  atomicity for a single-process store). Cross-file atomicity under process crash
  mid-write is out of scope for this local adapter (ADR-0020); documented for a
  future durable/transactional store.
- **Stream ids** are restricted to a safe pattern (`[A-Za-z0-9._-]+`) to prevent
  path traversal in the filesystem adapter; violations return `InvalidStreamIdError`.

## Residual risks

- JSONL cross-file crash-atomicity is not provided (see caveat above).
- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
