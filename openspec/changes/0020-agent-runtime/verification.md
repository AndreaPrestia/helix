# Verification: Agent runtime

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
 Tasks:    12 successful, 12 total

$ corepack pnpm test
> vitest run
 ✓ packages/execution/src/execution-session.test.ts
 ... (all package + architecture + bootstrap suites)
 Test Files  41 passed (41)
      Tests  259 passed (259)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    10 successful, 10 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`execution/agent-runtime`) | Implementation | Test evidence |
|---|---|---|
| execution sessions | `ExecutionSession` state machine (`running`→`completed`/`cancelled`/`failed`) | `execution-session.test.ts` |
| tool permissions | `authorizeTool`/`invokeTool` deny-by-default against `allowedTools` | `execution-session.test.ts` |
| checkpointing | `checkpoint` capture + `restore` resume | `execution-session.test.ts` |
| cancellation | `cancel` (required reason); terminal state rejects further work | `execution-session.test.ts` |
| artifact capture | `captureArtifact` records artifacts while running | `execution-session.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (259).
- [x] Architecture rules pass; `@helix/execution` is declared, public-entry-only, acyclic, importing only `@helix/core`.
- [x] No unapproved dependency introduced. (Adds only `tsup` + a `workspace:*` dependency on `@helix/core`.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/execution`** — declared in the enforced
  `package-dependency-rules.json` (`execution → @helix/core, @helix/events, @helix/planner`).
  This change uses only `@helix/core`; `@helix/events` and `@helix/planner` are
  allowed but not required for session lifecycle (avoids unused dependencies).
- **No provider coupling:** the agent runtime intentionally does not depend on
  `@helix/plugin-sdk`/provider contracts (the enforced ruleset forbids that edge).
  Session lifecycle is orthogonal to provider invocation, which the composition
  root wires separately — preserving provider independence (Article 4).
- **Deny-by-default tool permissions (Article 8):** a session authorizes only the
  tools in its `allowedTools` set; an empty set permits none.
- **Determinism & explicit failure (Articles 3, 7):** artifact/checkpoint ids and
  timestamps come from injected `IdGenerator`/`Clock`; terminal sessions reject
  further work with a typed `SessionStateError`, and permission denials return a
  typed `ToolPermissionError`.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
