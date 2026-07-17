# Verification: CLI foundation

## Command evidence

```text
corepack pnpm install
  Done in 1.2s (265 resolved, 189 reused)

corepack pnpm format
  All files formatted (no changes to committed sources).

corepack pnpm lint
  > eslint .
  (no findings)

corepack pnpm typecheck   (turbo run typecheck)
  Tasks:    14 successful, 14 total
  @helix/cli:typecheck  > tsc -p tsconfig.json --noEmit   (clean)
  EXIT=0

corepack pnpm test        (vitest)
  Test Files  46 passed (46)
       Tests  299 passed (299)

corepack pnpm architecture:test
  Test Files  3 passed (3)
       Tests  23 passed (23)

corepack pnpm build
  Tasks:    12 successful, 12 total
  @helix/cli:build  ESM Build success / DTS Build success

corepack pnpm install --frozen-lockfile
  Done in 568ms   EXIT=0

corepack pnpm format:check
  All matched files use Prettier code style!   EXIT=0
```

## Requirement → evidence

| Requirement (cli/cli-foundation) | Implementation | Tests |
| --- | --- | --- |
| command framework | `apps/cli/src/cli.ts` (`Cli.register`/`run` dispatch, help, unknown-command handling), `apps/cli/src/command.ts` (`Command`, `CommandContext`, `CommandResult`) | `apps/cli/src/cli.test.ts` (help, unknown command, run, thrown-error mapping) |
| configuration discovery | `apps/cli/src/config.ts` (`discoverConfig` walk-up, `ConfigReader` port, `fileSystemConfigReader`) | `apps/cli/src/config.test.ts` (none, start-dir, walk-up, nearest-wins, invalid JSON, non-object, custom filename) |
| structured output | `apps/cli/src/output.ts` (`formatOutput` text/JSON), `apps/cli/src/args.ts` (`parseArgs`) | `apps/cli/src/output.test.ts`, `apps/cli/src/args.test.ts`, `cli.test.ts` (`--json`) |
| exit codes | `apps/cli/src/command.ts` (`ExitCode` success/error/usage) applied in `cli.ts` | `apps/cli/src/cli.test.ts` (success, usage on unknown, error on throw) |
| diagnostics | `apps/cli/src/command.ts` (`Diagnostic`, `DiagnosticSeverity`) emitted to the error stream in `cli.ts` | `apps/cli/src/cli.test.ts` (diagnostic written to stderr) |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **In-house command framework.** No third-party CLI library (commander/yargs) was
  introduced. The framework is built on `@helix/core` primitives only, keeping the
  runtime dependency surface minimal (spec Non-goal: "vendor-specific shortcuts").
- **First `apps/` composition root.** `apps/cli` (`@helix/cli`) is the first package
  under `apps/`. It exposes a root-only `exports` entry plus a `bin` (`helix`) and is
  `private`.
- **Architecture harness refinement.** `checkDeclaredResponsibilities` in
  `tests/architecture/checker/rules.ts` now scopes the declared-package requirement to
  `group === 'packages'`. The dependency ruleset's `packages` map enumerates library
  packages only; apps are composition roots and plugins are extensions, so requiring
  them to appear in that map was incorrect. A regression test was added to
  `tests/architecture/package-boundaries.test.ts`. Public-entry-point rules still apply
  to the app (it has `src/index.ts` and a root-only `exports`).
- **`main.ts` excluded from unit tests.** The `helix` bin entry only wires process
  globals (argv/stdout/stderr/exit) to the injectable `Cli`; all behaviour lives in
  unit-tested modules.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays
  unchecked; the change awaits review before acceptance and archival.
