# ADR-0013 — Monorepo Package Boundaries

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

One package owns one responsibility. Package dependencies form a directed acyclic graph validated in CI.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
