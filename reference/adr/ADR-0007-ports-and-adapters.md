# ADR-0007 — Ports and Adapters

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Engines expose public contracts. Infrastructure and integrations implement adapters. Composition occurs only in application entry points.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
