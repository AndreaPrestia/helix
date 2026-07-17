# Verification: Specification aggregate

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
> tsc -p tsconfig.json --noEmit && turbo run typecheck
 Tasks:    1 successful, 1 total

$ corepack pnpm test
> vitest run
 ✓ packages/core/src/specification/requirement.test.ts (5)
 ✓ packages/core/src/specification/specification.test.ts (12)
 ✓ packages/core/src/specification/status.test.ts (4)
 ... (all core + architecture + bootstrap suites)
 Test Files  17 passed (17)
      Tests  83 passed (83)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 Test Files  3 passed (3)
      Tests  22 passed (22)
# @helix/core still conforms after adding the specification aggregate

$ corepack pnpm build
> turbo run build
@helix/core:build: ESM dist\index.js 11.59 KB
@helix/core:build: DTS dist\index.d.ts 13.41 KB
 Tasks:    1 successful, 1 total
```

## Requirement → evidence mapping

| Requirement (`domain/specification-aggregate`) | Implementation | Test evidence |
|---|---|---|
| lifecycle state machine | `specification/status.ts`, `specification.ts` (`draft→review→approved→implemented→superseded→archived`) | `specification.test.ts` (full lifecycle + illegal transition), `status.test.ts` |
| requirements collection | `specification.ts` `addRequirement` / `transitionRequirement`, `requirement.ts` | `specification.test.ts`, `requirement.test.ts` |
| review submission and approval | `specification.ts` `submitForReview` / `approve` | `specification.test.ts` |
| domain events | `specification/events.ts`; events raised on every transition | `specification.test.ts` (ordered event assertions, determinism) |
| rehydration and snapshots | `specification.ts` / `requirement.ts` `toSnapshot` + `fromSnapshot`, `snapshot.ts` | `specification.test.ts`, `requirement.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (83).
- [x] Architecture rules pass; `@helix/core` remains declared, public-entry-only, acyclic, and domain-isolated.
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Package placement decision (grounded, not invented):** the Specification
  domain aggregate lives in `@helix/core`. ADR-0014 states the core kernel
  "contains ... value objects, aggregate roots, domain events"; ADR-0015 mandates
  rich aggregates; and the enforced `reference/architecture/package-dependency-rules.json`
  declares only `core` (no `specification` package). Creating a separate
  `@helix/specification` package would fail the `0002` declared-responsibilities
  gate and require editing frozen reference data. `system-overview.md`'s planned
  `specification` package refers to the OpenSpec **registry/traceability** concern
  (roadmap `0010-openspec-engine`), not this pure-domain aggregate.
- **Lifecycles follow the frozen `state-machines.md` exactly** (Specification and
  Requirement forward transitions). No transitions beyond the frozen machine were
  invented (e.g. no `review → draft`).
- **`DomainEvent` payload type fix (in-scope):** the `0003` contract typed
  `payload` as `Readonly<Payload>`, but `Readonly<unknown>` resolves to `{}` and
  rejected generic payloads. Changed to `readonly payload: Payload` (the field is
  already read-only). No behavioral change; all `0003` tests still pass.
- **Determinism** proven with a fixed clock and sequential id generator
  (Constitution Article 3).

## Residual risks

- The reference-taxonomy inconsistency across
  `package-dependency-rules.json` / `allowed-dependencies.yaml` / `system-overview.md`
  (differing package sets; `core → shared`) remains open and should be reconciled
  via governance before a change requires a package absent from the enforced
  ruleset. It does not block this change.
- Independent review and archival remain pending.
