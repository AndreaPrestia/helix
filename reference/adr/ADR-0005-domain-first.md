# ADR-0005 — Domain-First Architecture

- Status: Accepted
- Date: 2026-07-17

## Context

Helix requires a stable architecture before implementation expands.

## Decision

The domain is independent from filesystem, Git, networking, databases, frameworks and AI providers. External behaviour is accessed through explicit ports.

## Consequences

- Architecture rules become machine-verifiable.
- Violations block integration.
- Changes require a superseding ADR.
