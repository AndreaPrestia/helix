# ADR-0020 — JSONL Filesystem Event Store

**Status:** Accepted

Helix provides a durable, dependency-free filesystem adapter. Each stream is stored as append-compatible JSONL under a SHA-256-derived filename. Writes use staging files, fsync, atomic rename, optimistic concurrency and deterministic sequence validation.
