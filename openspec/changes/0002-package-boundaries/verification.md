# Verification: Package boundaries and architecture tests

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
> tsc -p tsconfig.json --noEmit
# exit 0, no type errors

$ corepack pnpm test
> vitest run
 ✓ tests/architecture/dependency-graph.test.ts (4)
 ✓ tests/architecture/package-boundaries.test.ts (16)
 ✓ tests/architecture/workspace-boundaries.test.ts (2)
 ✓ tests/bootstrap/ci.test.ts (2)
 ✓ tests/bootstrap/scripts.test.ts (1)
 ✓ tests/bootstrap/typescript.test.ts (3)
 ✓ tests/bootstrap/workspace.test.ts (3)
 Test Files  7 passed (7)
      Tests  31 passed (31)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 ✓ tests/architecture/dependency-graph.test.ts (4)
 ✓ tests/architecture/package-boundaries.test.ts (16)
 ✓ tests/architecture/workspace-boundaries.test.ts (2)
 Test Files  3 passed (3)
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 • Running build in 0 packages
 Tasks:    0 successful, 0 total
# no runtime packages exist yet; enforcement runs against the empty workspace
```

## Requirement → evidence mapping

| Requirement (`foundation/package-boundaries`) | Implementation (rule) | Test evidence |
|---|---|---|
| declared package responsibilities | `checkDeclaredResponsibilities` | `tests/architecture/package-boundaries.test.ts` |
| acyclic dependency graph | `checkAcyclicDependencyGraph` (cycle + disallowed edge) | `tests/architecture/package-boundaries.test.ts` |
| public entry points only | `checkPublicEntryPoints` | `tests/architecture/package-boundaries.test.ts` |
| forbidden deep imports | `checkForbiddenDeepImports` | `tests/architecture/package-boundaries.test.ts` |
| domain isolation | `checkDomainIsolation` | `tests/architecture/package-boundaries.test.ts` |
| real workspace conforms | `loadWorkspacePackages` + `runAllChecks` | `tests/architecture/workspace-boundaries.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced. (Uses only the frozen baseline toolchain plus `yaml` from `0001`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations

- **No runtime `@helix/*` packages created.** Those belong to `0003` onward. This
  change delivers the release-blocking enforcement harness (pure rule functions +
  a filesystem loader) and proves each rule with in-memory fixtures. The harness
  auto-discovers real packages, so the same tests enforce boundaries as packages
  arrive; against the current empty workspace it reports zero violations.
- **Enforcement lives at repo root under `tests/architecture/`**, not as a
  workspace package, so it does not introduce a package undeclared in the frozen
  `package-dependency-rules.json` responsibilities map.
- **Import extraction is regex-based** over source text (static ESM
  `import`/`export ... from`, side-effect `import`, dynamic `import()`, and
  `require`). Sufficient and deterministic for the strict-ESM baseline.

## Residual risks

- **Reference-data discrepancy (not blocking `0002`).**
  `reference/architecture/allowed-dependencies.yaml` states `packages.core`
  `mayImport` `packages.shared`, while `reference/architecture/package-dependency-rules.json`
  declares `core: []` and has no `shared` entry. It does not affect this change
  (no packages exist yet), but it must be reconciled through governance before a
  change introduces `@helix/core` / `@helix/shared` (`0003`). The domain-isolation
  rule is intentionally scoped to what both authorities agree on: core must not
  import Node built-ins or infrastructure.
- Independent review and archival of the delta remain pending.
