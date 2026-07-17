# Verification: Repository graph

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
 Tasks:    6 successful, 6 total

$ corepack pnpm test
> vitest run
 ✓ packages/repository/src/repository-graph.test.ts
 ... (all core + events + governance + knowledge + architecture + bootstrap suites)
 Test Files  33 passed (33)
      Tests  190 passed (190)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    5 successful, 5 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`repository/repository-graph`) | Implementation | Test evidence |
|---|---|---|
| packages files symbols and tests | `model.ts` node kinds + `RepositoryGraph` nodes | `repository-graph.test.ts` |
| requirement and ADR links | `implements_requirement` / `references_adr` edges + `requirementLinks`/`adrLinks`/reverse queries | `repository-graph.test.ts` |
| incremental updates | `upsertNode`/`removeNode`/`upsertEdge`/`removeEdge` (idempotent) | `repository-graph.test.ts` |
| stable node identifiers | `ids.ts` (`packageNodeId`/`fileNodeId`/`symbolNodeId`/`testNodeId`) | `repository-graph.test.ts` |
| query API | `nodes`/`nodesByKind`/`neighbors`/`edgesFrom`/link queries (id-sorted) | `repository-graph.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (190).
- [x] Architecture rules pass; `@helix/repository` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/repository`** — declared in the enforced
  `package-dependency-rules.json` (`repository → @helix/core, @helix/events`).
  This change uses only `@helix/core`; `@helix/events` intentionally not added
  (allowed, not required).
- **Deterministic queries (Article 3):** every query returns results in a stable
  id-sorted order; node ids are derived deterministically from artifacts so the
  same artifact always maps to the same id, enabling reliable incremental updates
  and traceability (Article 6).
- **Explicit failure (Article 7):** `upsertEdge` returns a typed
  `UnknownNodeError` when a structural edge references a missing node; it never
  silently creates dangling nodes.
- **Traceability edges vs external refs:** `contains`/`tests` connect two graph
  nodes; `implements_requirement`/`references_adr` connect a node to an external
  requirement/ADR identifier (not required to be a graph node).

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
