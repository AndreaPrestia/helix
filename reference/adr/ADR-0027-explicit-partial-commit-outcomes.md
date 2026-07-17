# ADR-0027 — Explicit Partial Commit Outcomes

- Status: Accepted
- Date: 2026-07-17

## Decision

The transactional snapshot unit of work returns a structured commit result containing committed envelopes, snapshot statistics, snapshot failures and dispatch failure details.

A successful event append is never represented as a failed transaction merely because a derived snapshot or downstream dispatch failed.
