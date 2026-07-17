# Verification: Knowledge model

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
 Tasks:    5 successful, 5 total

$ corepack pnpm test
> vitest run
 ✓ packages/knowledge/src/knowledge-article.test.ts
 ... (all core + events + governance + architecture + bootstrap suites)
 Test Files  32 passed (32)
      Tests  182 passed (182)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    4 successful, 4 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`knowledge/knowledge-model`) | Implementation | Test evidence |
|---|---|---|
| knowledge articles | `knowledge-article.ts` (`KnowledgeArticle` entity) | `knowledge-article.test.ts` |
| patterns and anti-patterns | `kind.ts` (`article`/`pattern`/`anti_pattern`) | `knowledge-article.test.ts` (all kinds) |
| freshness metadata | `freshness.ts` (`Freshness`, `isStale`) + `review` | `knowledge-article.test.ts` (staleness, review) |
| ownership | `knowledge-article.ts` `owner` + `reassign` | `knowledge-article.test.ts` |
| links to decisions and code | `link.ts` + `addLink` (decision/code, dedupe) | `knowledge-article.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (182).
- [x] Architecture rules pass; `@helix/knowledge` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/knowledge`** — declared in the enforced
  `package-dependency-rules.json` (`knowledge → @helix/core, @helix/events`). This
  change uses only `@helix/core`; `@helix/events` was intentionally not added
  (allowed, not required — the model has no domain-event requirement).
- **Pure domain model:** `KnowledgeArticle` is an identity-bearing `Entity`
  (ADR-0005/0015) with validated construction and behaviors (`review`, `reassign`,
  `addLink`) that return typed `Result`s (Article 7). It imports only relative
  modules and `@helix/core`, so it stays provider- and infrastructure-agnostic.
- **Freshness is deterministic:** `review` takes an explicit instant (supplied by
  a `Clock` at the composition root), keeping staleness computation testable
  (Article 3).

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
