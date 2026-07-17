# ADR-0025 — Configurable Snapshot Policy

**Status:** Accepted

## Decision

Snapshot creation is controlled by an explicit interval, minimum aggregate version, and fallback-rebuild flag. No domain aggregate decides persistence frequency.
