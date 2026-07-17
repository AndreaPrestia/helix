# ADR-0026 — Post-commit Snapshot Coordination

- Status: Accepted
- Date: 2026-07-17

## Context

Event streams are authoritative while snapshots are derived optimizations. Writing a snapshot before the durable event append can expose state that never committed.

## Decision

Snapshot materialization occurs only after a successful atomic event-store append and after aggregate versions are marked committed. Snapshot failures are reported as retryable post-commit failures and never roll back committed events.

## Consequences

- No snapshot can advance beyond its authoritative stream.
- Snapshot stores may temporarily lag behind event streams.
- Callers receive explicit failure details for repair or retry.
