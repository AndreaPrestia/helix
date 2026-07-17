# ADR-0001 — Use the Repository as Project Memory

- Status: Accepted
- Date: 2026-07-17

## Context

Important project decisions and requirements were being retained primarily in
chat conversations. That context is fragile, expensive to reload and difficult
to audit.

## Decision

Helix stores product context, specifications, decisions, execution plans,
knowledge and agent rules in the repository.

## Consequences

- Context survives conversation loss.
- Agents can load targeted, versioned context.
- Documentation becomes a delivery responsibility.
- Repository maintenance increases slightly.
