# Verification: Monitoring dashboard

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 19 successful, 19 total   EXIT=0
corepack pnpm test                          Test Files 57 passed (57) / Tests 410 passed (410)   TEST=0
corepack pnpm architecture:test             Test Files 3 passed (3) / Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 14 successful, 14 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Built-binary smoke test (helix-dashboard; newline-delimited JSON { token, request })
$reqs | node apps/dashboard/dist/main.js
  {"event":"ready","token":"…","readOnly":true}
  {"ok":false,"code":"UNAUTHENTICATED","message":"a valid authentication token is required"}   # no token
  {"ok":false,"code":"UNAUTHENTICATED","message":"a valid authentication token is required"}   # wrong token
  EXIT=0
```

## Requirement → evidence (dashboard/dashboard)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| mobile-friendly monitoring | `apps/dashboard/src/dashboard.ts` — `Dashboard.summary()` compact counts + bounded list views (`DEFAULT_VIEW_LIMIT` 20, `MAX_VIEW_LIMIT` 200) | `dashboard.test.ts` "produces mobile-friendly counts", "bounds the default list size" |
| runs and tasks | `Dashboard.runs()`/`tasks()` project jobs→runs and sessions→tasks (id/sequence-sorted, status filter, single lookups) | `dashboard.test.ts` "lists runs sequence-sorted", "filters by status", "lists tasks id-sorted", single-lookup tests |
| reviews and failures | `Dashboard.failures()` surfaces failed runs with reasons; `summary.needsReview` counts runs awaiting review | `dashboard.test.ts` "surfaces failed runs with their reason"; summary `failures`/`needsReview` |
| read-only initial mode | `apps/dashboard/src/api.ts` — `DashboardApi` refuses mutating requests (`READ_ONLY`) before reaching the daemon; read-only defaults on | `api.test.ts` "refuses a mutating request even when authenticated", "still refuses control actions when read-only mode is disabled" |
| daemon authentication | `apps/dashboard/src/auth.ts` — `TokenAuthenticator` (constant-time token compare, no token in errors); every API request authenticated first | `auth.test.ts` (valid/unknown/absent/empty); `api.test.ts` "rejects requests without a valid token", "serves an authenticated request" |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **Backend/view-model dashboard, not a web UI.** A vendor-coupled web front-end
  (framework, bundler) would violate the spec Non-goal against vendor-specific shortcuts.
  This change delivers the dashboard's deterministic, testable read-model and authenticated
  read-only API; rendering that model in a browser is a separate, later concern.
- **Decoupled from the daemon app (no app→app import).** The dashboard defines its own
  read-only `DashboardSnapshot` input and a `DashboardSource` port. Daemon records are
  structurally compatible, so the composition root can feed daemon state directly without
  importing `@helix/daemon`. Dependencies stay `@helix/core` only.
- **New `apps/` composition root.** `apps/dashboard` (`@helix/dashboard`, `private`,
  `helix-dashboard` bin) is app-exempt from declared-responsibilities; public-entry rules
  still apply.
- **In-memory / file snapshot source at runtime.** The bin reads a daemon snapshot from
  `HELIX_DASHBOARD_SNAPSHOT` (or an empty snapshot) and serves the API over stdin/stdout
  JSON with a minted local access token. Live daemon IPC is a later concern; all behaviour
  is port-tested. `main.ts` is excluded from unit tests.
- **"reviews and failures" grounded in available daemon data.** With no review records in
  daemon state yet, the dashboard surfaces failed runs as the review/failure queue
  (`failures()`, `needsReview`). Richer review integration can follow when review data is
  exposed to the daemon.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
