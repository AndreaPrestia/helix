# Claude Entry Point — Helix

You are implementing Helix under Specification-Driven Development. `IMPLEMENTATION_CONTRACT.md` is mandatory and binding. The architecture is frozen at `architecture-baseline/v0.2.1`.

## First action in every session

Read, in order:

1. `IMPLEMENTATION_CONTRACT.md`
2. `openspec/project.md`
3. `openspec/constitution.md`
4. `architecture-baseline/v0.2.1/BASELINE.md`
5. `architecture-baseline/v0.2.1/DEPENDENCY_RULES.md`
6. `openspec/implementation-roadmap.md`
7. `execution/change-status.yaml`
8. the single active change and its referenced ADRs/specs

Then state:

- active change;
- current repository gap;
- frozen constraints;
- files expected to change;
- verification commands.

Do not edit before completing that analysis.

## Non-negotiable rules

- Implement one change only.
- Do not redesign frozen architecture.
- Do not start the next change.
- Do not fabricate verification results.
- Do not weaken specs, tests, or quality gates.
- Stop on contradictions, missing ADRs, frozen-baseline conflicts, or security-sensitive operations requiring approval.
- Finish by updating `verification.md` and `execution/change-status.yaml` and issuing the contract completion report.

The repository, not chat context, is authoritative.
