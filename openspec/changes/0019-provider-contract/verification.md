# Verification: Provider contract and reference provider

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
 ✓ packages/plugin-sdk/src/provider/reference-provider.test.ts
 ... (all package + architecture + bootstrap suites)
 Test Files  40 passed (40)
      Tests  247 passed (247)

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

| Requirement (`plugins/provider-contract`) | Implementation | Test evidence |
|---|---|---|
| model discovery | `AiProvider.listModels` + `ReferenceProvider` | `reference-provider.test.ts` |
| completion and tool calls | `complete` returning `CompletionResult` with `toolCalls` | `reference-provider.test.ts` |
| streaming | `stream` returning an `AsyncIterable<StreamChunk>` | `reference-provider.test.ts` |
| usage accounting | `Usage` (prompt/completion/total) computed deterministically | `reference-provider.test.ts` |
| structured errors | `ProviderError` (`ModelNotFoundError`, `InvalidRequestError`) via `Result` | `reference-provider.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (247).
- [x] Architecture rules pass; the code lives in `@helix/plugin-sdk` (declared, public-entry-only, acyclic, imports only `@helix/core`).
- [x] No unapproved dependency introduced. (No new dependencies.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **Placement in `@helix/plugin-sdk`.** ADR-0002/0009 make providers plugins that
  implement versioned capability contracts, and the SDK is the capability-contracts
  package. The enforced `package-dependency-rules.json` has no dedicated provider
  package; a new `@helix/*` (or `plugins/*`) package would fail the `0002`
  declared-responsibilities gate and require editing frozen reference data. The AI
  provider contract and a reference provider therefore ship in the SDK's
  `provider/` submodule.
- **Reference provider is vendor-neutral (ADR-0002):** `ReferenceProvider` is a
  deterministic echo implementation used to exercise the contract and verify
  conformance; it couples to no AI vendor, preserving provider independence
  (Constitution Article 4).
- **Explicit failure (Article 7):** every operation returns a `Result` with typed
  `ProviderError`s; `stream` validates the request and returns an error before
  producing any chunk.
- **Determinism (Article 3):** completion content, usage, and stream chunk order
  are fully deterministic.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
