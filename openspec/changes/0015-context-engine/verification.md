# Verification: Context engine

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
 Tasks:    7 successful, 7 total

$ corepack pnpm test
> vitest run
 ✓ packages/context/src/context-engine.test.ts
 ... (all core + events + governance + knowledge + repository + architecture + bootstrap suites)
 Test Files  35 passed (35)
      Tests  205 passed (205)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    6 successful, 6 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`context/context-engine`) | Implementation | Test evidence |
|---|---|---|
| context manifests | `model.ts` (`ContextManifest`, `ContextCandidate`) + manifest validation | `context-engine.test.ts` |
| deterministic selection | `context-engine.ts` stable ordering (priority desc, tokens asc, id asc) | `context-engine.test.ts` (tie-break + equality) |
| token budgeting | greedy packing within `budget`; over-budget items excluded | `context-engine.test.ts` |
| priority and exclusion rules | priority ordering + `excludeIds`/`excludeTags` | `context-engine.test.ts` |
| provenance | `ProvenanceEntry` per candidate with decision + reason | `context-engine.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (205).
- [x] Architecture rules pass; `@helix/context` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/context`** — declared in the enforced
  `package-dependency-rules.json` (`context → @helix/core, @helix/knowledge, @helix/repository`).
  The selection engine is source-agnostic and depends only on `@helix/core`;
  `@helix/knowledge` and `@helix/repository` are allowed but not required — the
  composition root supplies candidates derived from them (avoids unused
  dependencies).
- **Determinism (Article 3):** identical manifests always yield identical
  selections — candidates are excluded by rule, ordered by (priority desc, tokens
  asc, id asc), then greedily packed within budget; excluded and provenance lists
  are id-sorted. A `budget` and `tokens` model provides token budgeting.
- **Provenance (Article 6) & explicit failure (Article 7):** every candidate has a
  provenance entry (included/excluded + reason); over-budget items are recorded as
  excluded rather than silently dropped; invalid manifests and duplicate candidate
  ids return typed `ContextError`s.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
