# Verification: Prompt compiler

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
 Tasks:    9 successful, 9 total   (7 packages + dependency builds)

$ corepack pnpm test
> vitest run
 ✓ packages/prompt/src/prompt-compiler.test.ts
 ... (all core + events + governance + knowledge + repository + context + architecture + bootstrap suites)
 Test Files  36 passed (36)
      Tests  213 passed (213)

$ corepack pnpm architecture:test
> vitest run tests/architecture
      Tests  22 passed (22)

$ corepack pnpm build
> turbo run build
 Tasks:    7 successful, 7 total

$ corepack pnpm install --frozen-lockfile
Already up to date
```

## Requirement → evidence mapping

| Requirement (`prompt/prompt-compiler`) | Implementation | Test evidence |
|---|---|---|
| canonical sections | `section.ts` (`promptSectionKinds`) + compiler grouping | `prompt-compiler.test.ts` |
| provider-neutral prompt IR | `CompiledPrompt.sections` (no vendor formatting) | `prompt-compiler.test.ts` |
| deterministic ordering | compiler emits canonical order regardless of input order; merges same-kind in input order | `prompt-compiler.test.ts` |
| hashable output | `hash.ts` SHA-256 over rendered text; stable + change-sensitive | `prompt-compiler.test.ts` |
| secret redaction | `redaction.ts` (`SecretRedactor`) applied before output; count reported | `prompt-compiler.test.ts` |

## Acceptance evidence

- [x] Requirements mapped to tests.
- [x] Tests pass (213).
- [x] Architecture rules pass; `@helix/prompt` is declared, public-entry-only, acyclic, importing only `@helix/core` and `@helix/context` (allowed edges).
- [x] No unapproved dependency introduced. (`node:crypto` for hashing; `@types/node`/`tsup` dev only.)
- [ ] Reviewer findings resolved. (Pending independent review.)

## Deviations and decisions

- **New package `@helix/prompt`** — declared in the enforced
  `package-dependency-rules.json` (`prompt → @helix/core, @helix/context`). It
  imports both (the compiler renders a `ContextSelection` into the context
  section), exercising the allowed `prompt → context` edge.
- **Provider independence (Article 4):** the compiler emits a provider-neutral IR
  (`CompiledPrompt.sections`); vendor-specific rendering is deferred to providers
  (`0019`).
- **Determinism (Article 3):** canonical section order is fixed; same-kind
  sections merge in input order; identical inputs yield an identical hash.
- **Hashable output:** SHA-256 via the built-in `node:crypto` — no third-party
  dependency; the prompt package legitimately uses Node built-ins (only
  `@helix/core` is isolation-locked).
- **Secret redaction (Articles 7/8):** secrets are redacted before output and the
  redaction count is reported, so a leak is never hidden behind a successful
  compile; a custom `SecretRedactor` may be supplied.

## Residual risks

- The broader reference-taxonomy inconsistency remains open for governance.
- Independent review and archival remain pending.
