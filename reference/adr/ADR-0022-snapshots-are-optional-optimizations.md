# ADR-0022 — Snapshots Are Optional Optimizations

**Status:** Accepted

Snapshots may accelerate aggregate loading but are never the source of truth. They are atomically replaceable, independently versioned, disposable, and must be rebuildable from the event stream.
