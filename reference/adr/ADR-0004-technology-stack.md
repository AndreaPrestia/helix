# ADR-0004 — Technology Stack and Baseline

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Helix uses TypeScript 5.x, Node.js 22 LTS, pnpm, Turborepo, tsup, Vitest, ESLint flat config, Prettier, native ESM, GitHub Actions and Docker. Architecture follows DDD, Ports and Adapters and event-driven principles.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
