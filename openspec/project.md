# OpenSpec Project: Helix

## Vision

Helix is a provider-agnostic, deterministic software engineering platform that turns repository-resident governance, specifications, decisions, and knowledge into executable engineering workflows.

## Product boundary

Helix owns governance, repository intelligence, context construction, planning, provider orchestration, review, quality gates, traceability, and release workflows.

Helix does not own the implementation details of the products developed with it. Those products retain their own repositories, specifications, domain models, and release processes.

## Platform planes

- Governance Engine: what may be done.
- Knowledge Engine: what must be known.
- Repository Engine: what exists and what is affected.
- Context Engine: which bounded evidence is supplied.
- Execution Engine: how approved work is planned and executed.
- Review Engine: how output is evaluated.
- Plugin Engine: how providers and external systems are integrated.

## Initial applications

- `helix` CLI
- local daemon
- mobile-friendly dashboard

## Technology baseline

TypeScript 5.x, Node.js 22 LTS, pnpm, Turborepo, tsup, Vitest, ESLint flat config, Prettier, native ESM, GitHub Actions, Docker.
