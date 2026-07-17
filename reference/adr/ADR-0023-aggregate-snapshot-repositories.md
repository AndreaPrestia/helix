# ADR-0023 — Aggregate Snapshot Repositories

**Status:** Accepted

## Decision

Snapshot-aware repositories may restore an aggregate from a compatible snapshot and replay only subsequent events. The event stream remains authoritative.

## Consequences

- Snapshot state is explicit and versioned.
- Domain aggregates own snapshot state conversion.
- Repository policies decide when snapshots are written.
