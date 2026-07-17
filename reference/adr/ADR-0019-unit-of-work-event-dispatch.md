# ADR-0019 — Unit of work and committed-event dispatch

- **Status:** Accepted
- **Date:** 2026-07-17

## Decision

The unit of work atomically appends tracked aggregate streams, marks aggregates committed, and only then dispatches the committed envelopes. Dispatch never appends the same events again.
