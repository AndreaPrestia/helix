# ADR-0028 — Snapshot Policy Outside the Domain

- Status: Accepted
- Date: 2026-07-17

## Decision

Snapshot cadence, minimum version and repair behavior remain application-level policy. Domain aggregates expose immutable state capture but do not decide when persistence optimizations occur.
