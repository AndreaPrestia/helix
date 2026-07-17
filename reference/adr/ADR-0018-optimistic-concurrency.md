# ADR-0018 — Optimistic concurrency

- **Status:** Accepted
- **Date:** 2026-07-17

## Decision

Every event append supplies an expected stream version. A mismatch rejects the write with a typed concurrency error. Multi-stream commits validate every expected version before modifying any stream.
