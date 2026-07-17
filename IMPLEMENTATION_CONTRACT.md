# Helix Implementation Contract

**Contract version:** 1.0.0  
**Architecture baseline:** `v0.2.1`  
**Applies to:** every human or AI implementation agent working in this repository.

## 1. Purpose

This contract governs implementation of Helix from the accepted OpenSpec backlog. The implementing agent is an executor and verifier. It is not authorized to silently redesign the platform, weaken requirements, bypass quality gates, or expand the active scope.

## 2. Authority order

When documents conflict, apply this precedence order:

1. `reference/constitution/core.md`
2. `architecture-baseline/v0.2.1/BASELINE.md`
3. accepted ADRs under `reference/adr/`
4. accepted baseline specs under `openspec/specs/`
5. the active change's `proposal.md`
6. the active change's `design.md`
7. the active change's delta specs
8. the active change's `tasks.md`
9. repository conventions and existing implementation

A lower-level artifact MUST NOT override a higher-level artifact. Conflicts MUST be reported, not resolved by invention.

## 3. Mandatory reading order

Before changing code, the agent MUST read:

1. `CLAUDE.md`
2. this file
3. `openspec/project.md`
4. `openspec/constitution.md`
5. `architecture-baseline/v0.2.1/BASELINE.md`
6. `architecture-baseline/v0.2.1/DEPENDENCY_RULES.md`
7. all ADRs listed by the active change
8. the active change's `change.yaml`
9. `proposal.md`, `design.md`, delta specs, `tasks.md`, and `verification.md`
10. relevant baseline specs and package contracts

The agent MUST summarize the constraints it will enforce before implementation.

## 4. Scope control

- Exactly one change is active unless the user explicitly authorizes a batch.
- Only files required by the active change may be modified.
- Opportunistic refactoring is forbidden.
- Unrelated formatting changes are forbidden.
- The next change MUST NOT be started automatically.
- Existing incomplete work MUST be identified during gap analysis and incorporated only when it belongs to the active change.
- Generated files and lockfiles may be updated only when required by the active change or its verification commands.

## 5. Architecture freeze

The `v0.2.1` baseline is frozen. An implementation change MUST NOT alter:

- TypeScript, Node.js 22, pnpm, Turborepo, tsup, Vitest, ESLint flat config, Prettier, or native ESM as the baseline toolchain;
- DDD, rich aggregates, Ports & Adapters, event-driven integration, deterministic orchestration, plugin-first extensibility, or provider independence;
- package dependency direction and public API boundaries;
- repository-as-source-of-truth and traceability principles;
- the isolation of `@helix/core` from Node.js, filesystem, network, database, Git, UI, and AI providers.

Changing the baseline requires a separate architecture-evolution RFC, accepted ADRs, a new baseline version, migration plan, and explicit user approval. The implementation agent MUST stop and report the need; it MUST NOT create or accept that evolution autonomously.

## 6. Specification rules

- `MUST`, `MUST NOT`, `SHALL`, and `SHALL NOT` are mandatory and testable.
- Every scenario in a delta spec requires automated evidence unless explicitly marked manual.
- Acceptance criteria may not be weakened, reworded, or marked complete without evidence.
- Ambiguity that materially affects behavior requires a blocking question or a documented assumption approved by the user.
- Minor implementation details may be resolved using the nearest accepted ADR and existing repository conventions.
- Code is not the source of truth when it conflicts with an accepted specification.

## 7. Implementation discipline

The agent MUST:

- perform a repository gap analysis before editing;
- produce a file-level implementation plan mapped to task identifiers;
- use strict TypeScript and native ESM;
- preserve deterministic behavior outside model output;
- import other packages only through their public entry points;
- keep domain rules inside domain objects rather than application services;
- depend on ports in core/application logic and put infrastructure in adapters;
- add or update tests with each behavior change;
- keep the repository buildable at every completed task boundary;
- use the smallest coherent implementation satisfying the active change.

The agent MUST NOT:

- add a dependency merely to reduce implementation effort;
- create placeholder implementations presented as complete;
- suppress errors broadly with `any`, `@ts-ignore`, disabled lint rules, or skipped tests;
- delete failing tests or accepted documentation to make gates pass;
- use network access, credentials, production resources, or destructive commands without explicit authorization;
- rewrite Git history, force-push, merge, publish, release, or deploy unless explicitly instructed.

## 8. Dependency changes

A new runtime dependency is allowed only when:

1. the active design explicitly requires it, or the existing stack cannot reasonably satisfy the requirement;
2. its purpose, license, maintenance status, and security implications are documented;
3. package boundaries remain valid;
4. the dependency is added to the narrowest package that needs it.

Otherwise the agent MUST stop and propose an ADR amendment rather than installing it.

## 9. Verification protocol

Before declaring a change complete, run all applicable gates, normally:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm architecture:test
pnpm build
```

If a command is unavailable or fails because of the environment, the agent MUST:

- record the exact command;
- include the relevant error output;
- distinguish environment failure from product failure;
- run the strongest available alternative;
- leave the change unverified rather than claiming success.

No fabricated command output is permitted.

## 10. Completion state

A change may be reported as:

- `completed`: implementation and all required gates pass;
- `completed-with-environment-limitations`: implementation is complete, but explicitly listed gates could not run for environmental reasons;
- `blocked`: specification, architecture, dependency, security, or environment issue prevents correct completion;
- `failed`: implementation does not satisfy the change.

Only the user may approve proceeding after a blocked or failed result.

## 11. Required repository updates

For the active change, the agent MUST update:

- task checkboxes in `tasks.md` only when evidence exists;
- `verification.md` with commands, outcomes, evidence, deviations, and residual risks;
- `execution/change-status.yaml` with the final state;
- relevant changelog/release notes only when the change calls for them;
- specs or ADRs only through the documented governance process.

## 12. Required final report

The final report MUST contain:

1. active change and final state;
2. implemented task IDs;
3. concise design summary;
4. files added, modified, and removed;
5. tests added or changed;
6. commands executed and actual outcomes;
7. architecture and specification compliance evidence;
8. deviations and approved assumptions;
9. unresolved risks or follow-up work;
10. the next eligible change, without starting it.

## 13. Stop conditions

The agent MUST stop before implementation or immediately when it discovers:

- a conflict with the architecture baseline;
- contradictory mandatory requirements;
- a required architectural decision not covered by an accepted ADR;
- a security-sensitive operation lacking explicit authorization;
- a need to modify a frozen artifact;
- changes outside the active scope that are necessary to continue;
- evidence that a previous change is incomplete and blocks the active one.

The stop report MUST identify the exact documents and clauses involved and propose the smallest governance action needed.

## 14. Self-hosting transition

Until change `0030-self-hosting` is accepted and verified, OpenSpec and this contract govern Helix directly. After self-hosting, Helix may execute these rules, but the repository artifacts remain authoritative. Automation does not weaken governance.
