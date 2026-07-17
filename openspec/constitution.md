# Helix Constitution

## Article 1 — Repository truth
All durable project knowledge MUST reside in version-controlled artifacts. Conversations are exploratory, never authoritative.

## Article 2 — Specification before implementation
Every feature, behavior change, migration, and architectural change MUST originate from an approved OpenSpec change.

## Article 3 — Determinism
Given the same repository state, configuration, task, provider declaration, and context manifest, Helix MUST produce the same plan, selected context, validation results, and prompt structure.

## Article 4 — Provider independence
Core platform packages MUST NOT depend on a specific LLM vendor. Providers are plugins implementing stable contracts.

## Article 5 — Domain isolation
The domain MUST NOT depend on infrastructure, Node APIs, framework APIs, persistence, Git, network, or AI providers.

## Article 6 — Traceability
Requirements, specifications, tasks, commits, reviews, quality-gate evidence, and releases MUST be linkable.

## Article 7 — Explicit failure
Partial commits, retryable failures, provider errors, validation failures, and policy denials MUST be represented explicitly and never hidden behind success states.

## Article 8 — Security boundaries
Plugins, tools, secrets, and agent operations MUST be least-privileged, auditable, and deny-by-default.

## Article 9 — Testable governance
Architectural and policy rules SHOULD be machine-verifiable. A prose-only prohibition is insufficient when an automated test is feasible.

## Article 10 — Self-hosting trajectory
Helix MUST progressively become capable of governing its own development. Self-hosting is a milestone, not a prerequisite for the initial implementation.
