# Helix OpenSpec Implementation Pack v2

This package is the authoritative Specification-Driven Development backlog for implementing Helix with Claude or another disciplined coding agent.

## Architectural model

OpenSpec bootstraps Helix. Helix later incorporates and automates this governance model for future projects and eventually for itself. The repository remains the source of truth throughout the self-hosting transition.

## Start here

1. Copy the pack into the root of the Helix repository and commit it.
2. Read `IMPLEMENTATION_CONTRACT.md`.
3. Confirm `architecture-baseline/v0.2.1` is present and unchanged.
4. Optionally run the read-only audit prompt in `prompts/00-audit-before-start.md`.
5. Start Claude with `prompts/01-start-implementation.md`.
6. Review and commit one completed change at a time.
7. Use `prompts/02-continue-next-change.md` for subsequent changes.

## Contents

- frozen architecture baseline;
- implementation contract;
- Constitution and accepted ADRs;
- baseline OpenSpec specifications;
- 31 ordered implementation changes;
- per-change metadata binding each change to baseline `v0.2.1`;
- task and verification templates;
- quality gates, agent contracts, and execution status;
- prompts for audit, implementation, review, repair, and archive;
- Conflict Impact Atlas bootstrap as first external dogfood.

Claude must not implement multiple changes in one run unless explicitly authorized.
