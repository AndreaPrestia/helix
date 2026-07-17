# Verification: OpenSpec governance engine

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
 Tasks:    4 successful, 4 total   (@helix/core, @helix/events, @helix/governance)

$ corepack pnpm test
> vitest run
 ✓ packages/governance/src/parsers.test.ts
 ✓ packages/governance/src/engine.test.ts   (in-memory + real filesystem)
 ✓ packages/governance/src/apply.test.ts
 ... (all core + events + architecture + bootstrap suites)
 Test Files  30 passed (30)
      Tests  166 passed (166)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)
# @helix/governance -> @helix/core is an allowed, non-deep edge; graph acyclic

$ corepack pnpm build
> turbo run build
 Tasks:    3 successful, 3 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`governance/openspec-engine`) | Implementation | Test evidence |
|---|---|---|
| discover baseline specs | `engine.ts` `discoverBaselineSpecs` + `parse-spec.ts` | `engine.test.ts` (in-memory + real repo), `parsers.test.ts` |
| discover active changes | `engine.ts` `discoverActiveChanges` + `parse-manifest.ts` / `parse-delta.ts` | `engine.test.ts` |
| validate change structure | `validate.ts` `validateChangeStructure` | `apply.test.ts` |
| apply deltas | `apply.ts` `applyDelta` (added/modified/removed with conflicts) | `apply.test.ts` |
| archive accepted changes | `apply.ts` `archiveChange` | `apply.test.ts`, `engine.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (166), including discovery/validation against the real `openspec/` tree.
- [x] Architecture rules pass; `@helix/governance` is declared, public-entry-only, acyclic, and imports only `@helix/core`.
- [x] No unapproved dependency introduced. (`yaml` for manifest parsing — see deviations; plus `@types/node`/`tsup`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/governance`** — declared in the enforced
  `package-dependency-rules.json` (`governance → @helix/core, @helix/events`).
  This change uses only `@helix/core`; `@helix/events` was intentionally not added
  to avoid an unused dependency (allowed, not required).
- **`yaml` runtime dependency** (MIT, `eemeli/yaml`) — justified under
  Implementation Contract §8: `change.yaml` manifests are YAML and Node has no
  native parser. Added to the narrowest package that needs it.
- **Ports & Adapters:** engine I/O goes through a minimal read-only
  `OpenSpecFileStore` port with in-memory and filesystem adapters; parsing,
  validation, delta application, and archival are pure and deterministic.
- **Explicit failure (Article 7):** parsing/validation/delta application return
  `Result` with typed `GovernanceError` subclasses (`ParseError`,
  `ChangeValidationError` carrying all issues, `DeltaConflictError`).
- **`archive` returns a structured outcome** (archived id + merged baseline specs)
  rather than performing filesystem moves; persistence is a composition-root/adapter
  concern kept out of the engine.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
