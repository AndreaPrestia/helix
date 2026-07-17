# Verification: Repository query command

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 17 successful, 17 total   EXIT=0
corepack pnpm test                          Test Files 50 passed (50) / Tests 359 passed (359)   TEST=0
corepack pnpm architecture:test             Test Files 3 passed (3) / Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 12 successful, 12 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Built-binary smoke tests
node apps/cli/dist/main.js query nodes      0 result(s)                       Q1=0
node apps/cli/dist/main.js query bogus      error: [QUERY_UNKNOWN_KIND] unknown query kind "bogus"; expected one of:
                                            nodes, node, neighbors, implements, adr, impact     Q2=2
```

## Requirement → evidence (cli/query-command)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| repository graph queries | `apps/cli/src/commands/query.ts` — `createQueryCommand` over a `GraphSource`; kinds `nodes`/`node`/`neighbors`/`implements`/`adr`/`impact` using `@helix/repository` `RepositoryGraph` + `ImpactAnalyzer` | `query.test.ts` "query nodes/node/neighbors/traceability/impact" |
| filters and projections | `--kind` node/edge filter; `--select` projection (`parseProjection`, `projectNode`) | `query.test.ts` `parseProjection`, `projectNode`, "filters by node kind", "returns structural neighbors filtered by edge kind", single-node projection |
| JSON output | `--json` toggles the structured result vs rendered text | `query.test.ts` all `json: true` cases (`toEqual`/`toMatchObject` on the object shape) |
| bounded query complexity | `--limit` bounded by `MAX_QUERY_LIMIT` (1000), default 100 (`parseLimit`); over-limit listings truncate with a warning; impact seed count capped | `query.test.ts` `parseLimit`, "truncates and warns when the limit is exceeded", dispatch "rejects an invalid limit" |
| clear diagnostics | typed diagnostic codes (`QUERY_MISSING_KIND`, `QUERY_UNKNOWN_KIND`, `QUERY_INVALID_LIMIT`, `QUERY_INVALID_SELECT`, `QUERY_INVALID_NODE_KIND`, `QUERY_INVALID_EDGE_KIND`, `QUERY_MISSING_ARG`, `QUERY_UNKNOWN_NODE`, `QUERY_TRUNCATED`, `QUERY_TOO_MANY_SEEDS`) with usage vs error exit codes | `query.test.ts` dispatch + per-kind error cases |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **No new runtime dependency.** `apps/cli` adds `@helix/repository` (`workspace:*`) only;
  no third-party query/graph library was introduced.
- **Port-based command; empty runtime graph source.** The command consumes an injected
  `GraphSource` and is fully unit-tested over a populated in-memory graph. Populating the
  repository graph from a workspace is a later roadmap capability, so the binary's runtime
  source (`src/main.ts`) returns an empty graph — listing queries therefore return zero
  results deterministically. This is honest (it reports an empty graph, not a fake result)
  and does not conceal partial failure.
- **`query` sub-dispatch inside a single command.** Query kinds are selected by the first
  positional argument (`helix query <kind> …`) rather than as separate top-level commands,
  keeping the query surface cohesive within the 0022 command framework.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
