# Verification: Plugin SDK

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
 Tasks:    11 successful, 11 total

$ corepack pnpm test
> vitest run
 ✓ packages/plugin-sdk/src/manifest.test.ts
 ✓ packages/plugin-sdk/src/registry.test.ts
 ... (all package + architecture + bootstrap suites)
 Test Files  39 passed (39)
      Tests  239 passed (239)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    9 successful, 9 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`plugins/plugin-sdk`) | Implementation | Test evidence |
|---|---|---|
| plugin manifest | `manifest.ts` (`PluginManifest`, `validatePluginManifest`) | `manifest.test.ts` |
| API compatibility | `api-compatibility.ts` (`isApiCompatible`, `SDK_API_VERSION`) + registry check | `manifest.test.ts`, `registry.test.ts` |
| capability declarations | `CapabilityDeclaration` (versioned, unique) validated | `manifest.test.ts` |
| lifecycle | `lifecycle.ts` states/transitions + `PluginRegistry` activate/deactivate/failed | `manifest.test.ts`, `registry.test.ts` |
| sandbox and permission declarations | `permissions.ts` deny-by-default + registry enforcement | `manifest.test.ts`, `registry.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (239).
- [x] Architecture rules pass; `@helix/plugin-sdk` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/plugin-sdk`** — declared in the enforced
  `package-dependency-rules.json` (`plugin-sdk → @helix/core, @helix/events`).
  This change uses only `@helix/core`; `@helix/events` allowed but not required.
- **Deny-by-default sandbox (Article 8):** a plugin only receives the permissions
  explicitly granted at registration; any declared-but-ungranted permission is
  denied with a typed `PermissionDeniedError`.
- **Versioned capability contracts (ADR-0009/0010):** capabilities are declared
  with a name and semantic version; the host API version is checked for semver
  compatibility (same major, host at least as new).
- **Explicit failure (Article 7):** manifest validation aggregates all issues;
  lifecycle transitions are validated and a failing lifecycle hook moves the
  plugin to `failed` and returns the hook's error rather than swallowing it.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
