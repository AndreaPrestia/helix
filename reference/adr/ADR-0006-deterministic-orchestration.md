# ADR-0006 — Deterministic Orchestration

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Given identical repository state, configuration, specification, task and context manifest, Helix produces the same context selection, validation result and execution plan. Model output may remain non-deterministic.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
