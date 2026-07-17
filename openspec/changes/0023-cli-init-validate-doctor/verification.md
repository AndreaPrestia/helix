# Verification: Core CLI commands

## Command evidence

```text
corepack pnpm install
  Done in 991ms   EXIT=0

corepack pnpm lint
  > eslint .   (no findings)   EXIT=0

corepack pnpm exec turbo run typecheck
  Tasks:    16 successful, 16 total   EXIT=0
  @helix/cli:typecheck  > tsc -p tsconfig.json --noEmit   (clean)

corepack pnpm test        (vitest)
  Test Files  49 passed (49)
       Tests  333 passed (333)   EXIT=0

corepack pnpm architecture:test
  Test Files  3 passed (3)
       Tests  23 passed (23)   EXIT=0

corepack pnpm exec turbo run build
  Tasks:    12 successful, 12 total   EXIT=0
  @helix/cli:build  ESM + DTS build success (main.js, index.d.ts)

corepack pnpm install --frozen-lockfile
  Done in 565ms   FROZEN=0

corepack pnpm format:check
  All matched files use Prettier code style!   FMT=0

# Built-binary smoke tests (real filesystem + governance engine)
node apps/cli/dist/main.js doctor
  ok    node-binary: C:\nvm4w\nodejs\node.exe
  ok    node: 22.19.0
  warn  configuration: no configuration file found
        → run "helix init" or add a helix.config.json file
  ok    plugins: 0 plugin(s) compatible with API 1.0.0
  diagnostics passed        EXIT=0

node apps/cli/dist/main.js validate
  pass  openspec
  pass  architecture
  pass  quality-gate
  validation passed         VALIDATE_EXIT=0

node apps/cli/dist/main.js            (help)
  helix <command> [options]  →  doctor / init / validate     HELP_EXIT=0
```

## Requirement → evidence

### cli/init-command
| Requirement | Implementation | Tests |
| --- | --- | --- |
| repository bootstrap | `apps/cli/src/commands/init.ts` (`createInitCommand`, `FileSink` port) | `init.test.ts` "bootstraps template files plus a manifest" |
| template selection | `--template` flag + `templates` registry; unknown → usage error | `init.test.ts` "rejects an unknown template" |
| non-destructive behavior | conflict scan before any write; writes nothing on conflict | `init.test.ts` "is non-destructive: writes nothing when a target exists" |
| generated manifest | `helix.config.json` generated from `--name`/template | `init.test.ts` manifest content assertion |
| validation after generation | `validateManifest` run before writing; invalid → error | `init.test.ts` "fails validation when the project name is missing", `validateManifest` tests |

### cli/validate-command
| Requirement | Implementation | Tests |
| --- | --- | --- |
| OpenSpec validation | `openSpecValidationCheck` over `@helix/governance` `validateChangeStructure` | `validate.test.ts` `openSpecValidationCheck` (pass + structural issues) |
| architecture rules | `architectureRulesCheck(provider)`; runtime provider reads the dependency ruleset | `validate.test.ts` `architectureRulesCheck` (no violations + mapped violations) |
| quality gates | `qualityGateCheck` over `@helix/governance` `QualityGate` | `validate.test.ts` `qualityGateCheck` (pass + denied policy) |
| human and JSON output | `--json` toggles `ValidationReport` vs rendered text | `validate.test.ts` "--json"/"human text" |
| stable exit codes | `runChecks` → success (0) / error (1) | `validate.test.ts` exit-code cases + `runChecks` tests |

### cli/doctor-command
| Requirement | Implementation | Tests |
| --- | --- | --- |
| environment checks | `environmentProbe` | `doctor.test.ts` `environmentProbe` (present/absent) |
| toolchain checks | `toolchainProbe` (semver comparison via `@helix/plugin-sdk` `parseVersion`) | `doctor.test.ts` `toolchainProbe` (meets/old/unrecognized) |
| configuration diagnostics | `configurationProbe` over discovered `Option<CliConfig>` | `doctor.test.ts` `configurationProbe` (ok/warning) |
| plugin compatibility | `pluginCompatibilityProbe` via `@helix/plugin-sdk` `isApiCompatible` | `doctor.test.ts` `pluginCompatibilityProbe` (compatible/incompatible) |
| repair guidance | `DoctorCheck.remediation` on every non-ok result | `doctor.test.ts` remediation assertions; text renderer prints `→` guidance |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **No new runtime dependency.** Commands build on `@helix/core`, `@helix/governance`,
  and `@helix/plugin-sdk` only — all existing workspace packages. `apps/cli` now declares
  `@helix/governance` and `@helix/plugin-sdk` as `workspace:*` dependencies. No third-party
  CLI/validation library was introduced.
- **Port-based command logic; thin composition root.** Each command is a factory taking
  injected ports (`FileSink`, `ValidationCheck[]`, `DoctorProbe[]`), so all behaviour is
  unit-tested with fakes. `src/main.ts` is the only module touching the real filesystem,
  `process`, and the governance engine, and is excluded from unit tests (smoke-tested via
  the built binary above).
- **Runtime `architecture` check scope.** The `validate` command consumes an
  architecture-rules provider (fully tested via the port). The binary's runtime provider
  verifies the dependency ruleset is present and well-formed; the exhaustive static
  boundary analysis remains the vitest architecture harness. This is honest (it reports
  what it checks) and does not conceal failures.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays
  unchecked; the change awaits review before acceptance and archival.
