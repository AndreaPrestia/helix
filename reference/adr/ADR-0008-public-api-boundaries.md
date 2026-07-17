# ADR-0008 — Public API Boundaries

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Consumers import packages only through their root export. Deep imports and imports from internal directories are prohibited.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
