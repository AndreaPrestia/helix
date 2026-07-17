# Verification: Impact analysis

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
 ✓ packages/repository/src/impact.test.ts
 ... (all core + events + governance + knowledge + repository + architecture + bootstrap suites)
 Test Files  34 passed (34)
      Tests  197 passed (197)

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

| Requirement (`repository/impact-analysis`) | Implementation | Test evidence |
|---|---|---|
| changed nodes | `impact.ts` `analyze` (validates changed ids, reverse structural reachability) | `impact.test.ts` |
| affected requirements | `implements_requirement` links across impacted nodes | `impact.test.ts` |
| affected decisions | `references_adr` links across impacted nodes | `impact.test.ts` |
| recommended tests | impacted nodes of kind `test` | `impact.test.ts` |
| documentation impact | documentation file nodes (attribute-flagged) that are impacted or link to affected requirements/decisions | `impact.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (197).
- [x] Architecture rules pass; `@helix/repository` stays declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/repository`** — the spec lives under
  `repository/impact-analysis`; impact analysis operates over the repository graph
  from `0013`. Added as an `impact.ts` module; no new package and no dependency on
  `@helix/knowledge` (documentation impact is derived from graph file nodes).
- **Impact propagation:** impact flows along **reverse structural edges**
  (`contains`/`tests`) — a changed symbol impacts the file/package that contain it
  and the tests that exercise it. Requirement/ADR edges are external references and
  do not propagate node reachability.
- **Documentation impact** uses a convention: file nodes carrying
  `attributes[documentationAttribute] === 'true'` are documentation. Such a file
  is impacted when it is structurally affected OR references an affected
  requirement/ADR — no `0013` model change and no cross-package dependency.
- **Determinism (Article 3) & explicit failure (Article 7):** all outputs are
  id-sorted; an unknown changed node id returns a typed `UnknownNodeError`.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
