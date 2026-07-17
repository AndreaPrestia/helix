# Verification: Local daemon

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 18 successful, 18 total   EXIT=0
corepack pnpm test                          Test Files 54 passed (54) / Tests 389 passed (389)   TEST=0
corepack pnpm architecture:test             Test Files 3 passed (3) / Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 13 successful, 13 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Built-binary smoke test (helix-daemon over newline-delimited JSON on stdin)
$reqs | node apps/daemon/dist/main.js
  {"event":"ready","status":"running"}
  {"ok":true,"result":{"id":"…","workspaceRoot":"/tmp/x","status":"active","openedAt":"…"}}
  {"ok":false,"code":"SESSION_NOT_FOUND","message":"no session with id \"BOGUS\""}
  {"ok":true,"result":[{ …one active session… }]}
  {"ok":true,"result":{"status":"running"}}
  {"event":"shutdown","snapshot":{"sessions":[…],"jobs":[],"sequence":0}}   EXIT=0
```

## Requirement → evidence (daemon/local-daemon)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| workspace sessions | `apps/daemon/src/session-manager.ts` — `SessionManager` (one active session per workspace root, open/close, id-sorted listing) | `session-manager.test.ts` (open, duplicate rejection, reopen after close, close, idempotent close, unknown, list+snapshot) |
| job scheduling | `apps/daemon/src/job-scheduler.ts` — `JobScheduler` (monotonic FIFO enqueue, claim, complete/fail/cancel with state guards, per-session cancellation) | `job-scheduler.test.ts` (sequence, FIFO claim, terminal transitions, invalid-state, unknown, per-session cancel) |
| durable state | `apps/daemon/src/store.ts` — `DaemonStateStore` port + `InMemoryDaemonStateStore`; `Daemon` persists write-through after every mutation | `daemon.test.ts` "opens a session and persists state write-through"; store round-trip via recovery tests |
| local API | `apps/daemon/src/local-api.ts` — `LocalApi` transport-agnostic request/response dispatcher; `src/main.ts` serves it as newline-delimited JSON | `local-api.test.ts` (status, session ops, error mapping, claim-null, full job flow, shutdown) |
| safe shutdown and recovery | `apps/daemon/src/daemon.ts` — `shutdown()` drains to `stopped` and persists (idempotent); `Daemon.recover()` restores state and re-queues interrupted `running` jobs | `daemon.test.ts` (shutdown refuses work, idempotent shutdown, recover restores + re-queues, empty recover); `job-scheduler.test.ts` "re-queues running jobs on restore" |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **New `apps/` composition root.** `apps/daemon` (`@helix/daemon`, `private`) is the
  second app after `apps/cli`. It exposes a root-only `exports` entry plus a `bin`
  (`helix-daemon`). As an app it is exempt from the declared-responsibilities gate
  (harness refinement from 0022) while public-entry-point rules still apply.
- **No new runtime dependency.** The daemon is built entirely on `@helix/core`
  (`Result`/`Option`/`Clock`/`IdGenerator`). No web/server framework was introduced; the
  local API is a transport-agnostic dispatcher and the binary uses only Node built-ins
  (`readline`, `crypto`) for the stdin/stdout JSON transport.
- **In-memory durable store at runtime.** State is persisted write-through behind the
  `DaemonStateStore` port; the shipped adapter is in-memory (a filesystem/SQLite adapter
  is a later concern). All durability and crash-recovery semantics are exercised through
  the port in unit tests (interrupted `running` jobs are re-queued on recovery).
- **`main.ts` excluded from unit tests.** The bin only wires process globals and the
  stdin/stdout JSON transport; all behaviour lives in unit-tested modules and is
  smoke-tested via the built binary above.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
