# Verification: Core domain primitives

## Environment

- OS: Windows
- Node.js: v22.19.0
- Package manager: pnpm 9.15.0 via Corepack (`corepack pnpm`)
- Date: 2026-07-17

> `corepack enable` cannot write global shims here (`EPERM` under the nvm dir).
> pnpm was installed to a writable shim directory added to `PATH` so Turborepo
> can locate the `pnpm` binary; every command below ran the pinned pnpm.

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
@helix/core:typecheck: > tsc -p tsconfig.json --noEmit
 Tasks:    1 successful, 1 total

$ corepack pnpm test
> vitest run
 ✓ tests/architecture/dependency-graph.test.ts (4)
 ✓ tests/architecture/package-boundaries.test.ts (16)
 ✓ tests/architecture/workspace-boundaries.test.ts (2)
 ✓ tests/bootstrap/*.test.ts (9)
 ✓ packages/core/src/aggregate-root.test.ts (3)
 ✓ packages/core/src/domain-error.test.ts (3)
 ✓ packages/core/src/entity.test.ts (5)
 ✓ packages/core/src/identifier.test.ts (5)
 ✓ packages/core/src/option.test.ts (5)
 ✓ packages/core/src/result.test.ts (5)
 ✓ packages/core/src/value-object.test.ts (5)
 Test Files  14 passed (14)
      Tests  62 passed (62)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 Test Files  3 passed (3)
      Tests  22 passed (22)
# @helix/core is discovered and reports zero boundary violations

$ corepack pnpm build
> turbo run build
@helix/core:build: ESM dist\index.js 3.88 KB
@helix/core:build: DTS dist\index.d.ts 6.90 KB
 Tasks:    1 successful, 1 total
```

## Requirement → evidence mapping

| Requirement (`domain/core-primitives`) | Implementation | Test evidence |
|---|---|---|
| Entity and AggregateRoot | `packages/core/src/entity.ts`, `aggregate-root.ts` | `entity.test.ts`, `aggregate-root.test.ts` |
| ValueObject | `packages/core/src/value-object.ts` | `value-object.test.ts` |
| Result and Option | `packages/core/src/result.ts`, `option.ts` | `result.test.ts`, `option.test.ts` |
| typed identifiers | `packages/core/src/identifier.ts` | `identifier.test.ts` |
| Clock and IdGenerator ports | `packages/core/src/ports/clock.ts`, `id-generator.ts` | `aggregate-root.test.ts` (fake clock + id generator) |
| domain events and errors | `packages/core/src/domain-event.ts`, `domain-error.ts` | `aggregate-root.test.ts`, `domain-error.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (62).
- [x] Architecture rules pass; `@helix/core` conforms (declared, public entry point, no deep imports, acyclic, domain-isolated).
- [x] No unapproved dependency introduced. (Adds `tsup`, the frozen baseline build tool.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations

- **`tsup` devDependency** added to `@helix/core` — it is the frozen baseline
  build tool (Technology Baseline / ADR-0004), used to emit ESM + `.d.ts`.
- **`@helix/core` is dependency-free** (ADR-0014): imports only relative modules,
  no Node built-ins, infrastructure, or other `@helix` packages. This sidesteps
  the previously-noted `allowed-dependencies.yaml` vs `package-dependency-rules.json`
  `core → shared` discrepancy, which remains open for governance but does not
  affect this change.
- **Root tooling wiring (in-scope):** root `typecheck` now also runs
  `turbo run typecheck` so package typechecking is covered; root `vitest` include
  now covers `packages/**/src/**/*.test.ts`; the architecture loader now excludes
  `*.test.ts`/`*.spec.ts` from production-source scanning (a correctness fix so
  colocated tests do not trip the domain-isolation rule). `.gitignore` now ignores
  `.turbo`.
- **Determinism** is proven with a fixed clock and a sequential id generator
  (`aggregate-root.test.ts`), per Constitution Article 3.

## Residual risks

- Reference-data `core → shared` discrepancy must be reconciled via governance
  before any change introduces `@helix/shared`.
- Independent review and archival remain pending.
