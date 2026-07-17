# ADR-0011 — Event-Driven Integration

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Cross-engine reactions use immutable events with correlation and causation metadata. Direct engine-to-engine implementation coupling is prohibited.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
