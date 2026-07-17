# Verification: Workspace bootstrap

## Environment

- OS: Windows
- Node.js: v22.19.0
- Package manager: pnpm 9.15.0 via Corepack (`corepack pnpm`)
- Date: 2026-07-17

> `corepack enable` could not create global shims (`EPERM` writing the `yarn`
> shim under the nvm directory). This does not affect the gates: pnpm was invoked
> directly through `corepack pnpm`, so every command below ran the pinned pnpm.

## Command evidence

```text
$ corepack pnpm install
Packages: +156
Done in 7.6s
# generated pnpm-lock.yaml

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
 ✓ tests/bootstrap/ci.test.ts (2)
 ✓ tests/bootstrap/scripts.test.ts (1)
 ✓ tests/bootstrap/typescript.test.ts (3)
 ✓ tests/bootstrap/workspace.test.ts (3)
 Test Files  5 passed (5)
      Tests  13 passed (13)

$ corepack pnpm architecture:test
> vitest run tests/architecture
 ✓ tests/architecture/dependency-graph.test.ts (4)
 Test Files  1 passed (1)
      Tests  4 passed (4)

$ corepack pnpm build
> turbo run build
 • Packages in scope:
 • Running build in 0 packages
 Tasks:    0 successful, 0 total
# no packages exist yet at bootstrap; deterministic no-op success

$ corepack pnpm install --frozen-lockfile
Lockfile is up to date, resolution step is skipped
Already up to date
```

## Requirement → evidence mapping

| Requirement (`foundation/workspace-bootstrap`) | Implementation | Test evidence |
|---|---|---|
| pnpm workspace and Turborepo configuration | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | `tests/bootstrap/workspace.test.ts` |
| strict TypeScript base configuration | `tsconfig.base.json`, `tsconfig.json` | `tests/bootstrap/typescript.test.ts` |
| build, typecheck, lint and test scripts | `package.json` scripts, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts` | `tests/bootstrap/scripts.test.ts` |
| GitHub Actions CI | `.github/workflows/ci.yml` | `tests/bootstrap/ci.test.ts` |
| architecture test command | `architecture:test` script + `tests/architecture/dependency-graph.test.ts` | `corepack pnpm architecture:test` (4 passed) |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced. (Baseline devDependencies + `yaml`; see deviations.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations

- **`yaml` devDependency** (MIT, `eemeli/yaml`, actively maintained). Justified
  under Implementation Contract §8: validating `pnpm-workspace.yaml` and the CI
  workflow requires a YAML parser, which Node.js does not provide natively. Added
  to the narrowest scope (root dev tooling). All other devDependencies are the
  frozen baseline toolchain (TypeScript, Turborepo, Vitest, ESLint flat config,
  Prettier).
- **Prettier scope** (`.prettierignore`): the format gate is scoped to files this
  change introduces. Frozen governance artifacts (baseline, ADRs, specs, prompts,
  reference docs) are excluded so they are neither reformatted nor modified.
- **"Update public exports and package contracts"**: not applicable at bootstrap —
  no runtime packages exist yet (they arrive from `0003` onward). The root package
  is `private` and exposes no public API; the Public API Policy is encoded in the
  strict `tsconfig` baseline for future packages.
- **`build` gate**: Turborepo currently orchestrates zero packages, producing a
  deterministic no-op success. This is correct for the bootstrap scope.

## Residual risks

- Independent review and archive of the delta into baseline specs remain pending
  (governance step, outside implementation).
