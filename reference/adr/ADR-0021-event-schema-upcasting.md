# ADR-0021 — Event Schema Upcasting

**Status:** Accepted

Persisted events are immutable. Schema evolution occurs through registered, deterministic, one-way upcasters during reads. Upcasters must strictly increase schema versions and never perform I/O.
