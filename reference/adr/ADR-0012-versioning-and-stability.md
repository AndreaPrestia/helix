# ADR-0012 — Versioning and Stability Levels

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

Helix follows Semantic Versioning. Public APIs are classified Stable, Evolving, Experimental or Internal.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
