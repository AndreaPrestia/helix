# ADR-0002 — Provider-Agnostic Core

- Status: Accepted
- Date: 2026-07-17

## Decision

Helix core cannot directly depend on Claude, Codex, OpenAI, Gemini or any other
specific AI provider.

Provider support is implemented via contracts and plugins.

## Consequences

- Lower vendor lock-in.
- More adapter work.
- Common capabilities must be normalised carefully.
