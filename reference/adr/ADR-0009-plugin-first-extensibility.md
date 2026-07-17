# ADR-0009 — Plugin-First Extensibility

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

SCM, providers, issue trackers, CI, deployment and notifications are plugins implementing versioned capability contracts.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
