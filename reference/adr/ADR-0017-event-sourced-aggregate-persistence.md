# ADR-0017 — Event-sourced aggregate persistence

- **Status:** Accepted
- **Date:** 2026-07-17

## Decision

Specification and Task aggregates are persisted as ordered domain-event streams. Rehydration must rebuild state only from committed events and must not produce new uncommitted events.

## Consequences

Events must contain all state required for deterministic replay. Aggregate stream versions are the concurrency token.
