# ADR-0024 — Snapshot Fallback and Repair

**Status:** Accepted

## Decision

Missing, corrupt, incompatible, or semantically invalid snapshots must never prevent aggregate loading when the event stream is valid. The repository falls back to full replay and may rebuild the snapshot.

## Consequences

- Snapshot failures are observable in load results.
- Corruption is not silently accepted.
- Rebuilding never changes domain history.
