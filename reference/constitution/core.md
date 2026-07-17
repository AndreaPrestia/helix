# Helix Constitution

## Status

Accepted and binding.

## Principles

### H-CON-001 — Specification first

Every feature, behavioural change and public contract starts from an approved,
versioned specification.

### H-CON-002 — Traceability

Every implementation must be traceable to a requirement, task and test.

### H-CON-003 — Explainable architecture

Architectural decisions must be recorded through ADRs, including alternatives
and consequences.

### H-CON-004 — Repository as memory

Project knowledge belongs in the repository, not exclusively in conversations,
individual memory or temporary prompts.

### H-CON-005 — Context minimisation

Agents load the smallest sufficient context. When a context manifest exists,
whole-repository scanning is prohibited unless explicitly justified.

### H-CON-006 — Explicit agent responsibility

Every agent operates under a versioned Agent Contract declaring responsibilities,
allowed changes, forbidden changes and definition of done.

### H-CON-007 — Dependency discipline

Package boundaries are machine-readable and enforced. Domain and engine code
cannot depend on delivery, persistence or provider-specific infrastructure.

### H-CON-008 — Tests are contractual evidence

Tests verify specified behaviour. Business rules, public APIs, migrations,
security controls and release processes require appropriate automated evidence.

### H-CON-009 — Reproducible delivery

Every release is versioned, attributable to a commit, built as immutable
artifacts and deployable using documented procedures.

### H-CON-010 — Security by construction

Secrets never live in source control or container images. Sensitive data uses
appropriate hashing, encryption, key management, transport protection, backup
protection and rotation procedures.

### H-CON-011 — No silent assumptions

When a specification is materially incomplete, the agent proposes a
specification change rather than inventing hidden requirements.

### H-CON-012 — Provider independence

Helix core cannot depend on Claude, OpenAI, Codex, Gemini or another individual
AI provider. Provider support is implemented through adapters or plugins.

### H-CON-013 — Human and AI maintainability

Software must remain understandable, reviewable and operable by both humans and
agents years after initial implementation.
