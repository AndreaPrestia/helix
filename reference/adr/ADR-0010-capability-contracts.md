# ADR-0010 — Capability-Oriented Engines

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Engines expose named capabilities with typed inputs, outputs and errors rather than leaking internal classes.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
