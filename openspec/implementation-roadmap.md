# Implementation Roadmap

1. `0001-workspace-bootstrap` — Workspace bootstrap
2. `0002-package-boundaries` — Package boundaries and architecture tests
3. `0003-core-primitives` — Core domain primitives
4. `0004-specification-aggregate` — Specification aggregate
5. `0005-task-aggregate` — Task aggregate
6. `0006-event-runtime` — In-memory event runtime
7. `0007-event-persistence` — Durable event persistence
8. `0008-snapshot-runtime` — Snapshot runtime
9. `0009-durable-outbox` — Durable dispatch and outbox
10. `0010-openspec-engine` — OpenSpec governance engine
11. `0011-policy-engine` — Policy and quality gates
12. `0012-knowledge-model` — Knowledge model
13. `0013-repository-graph` — Repository graph
14. `0014-impact-analysis` — Impact analysis
15. `0015-context-engine` — Context engine
16. `0016-prompt-compiler` — Prompt compiler
17. `0017-execution-planner` — Execution planner
18. `0018-plugin-sdk` — Plugin SDK
19. `0019-provider-contract` — Provider contract and reference provider
20. `0020-agent-runtime` — Agent runtime
21. `0021-review-engine` — Review engine
22. `0022-cli-foundation` — CLI foundation
23. `0023-cli-init-validate-doctor` — Core CLI commands
24. `0024-query-command` — Repository query command
25. `0025-local-daemon` — Local daemon
26. `0026-dashboard` — Monitoring dashboard
27. `0027-metrics` — Engineering metrics
28. `0028-security-hardening` — Security model hardening
29. `0029-release-engine` — Release engine
30. `0030-self-hosting` — Helix self-hosting milestone
31. `0031-conflict-impact-atlas-bootstrap` — First external dogfood

## Delivery rule

Changes are sequential unless a proposal explicitly demonstrates independence. Claude MUST NOT implement multiple active changes in a single branch by default.

## Milestones

- M0: workspace and governance
- M1: domain and runtime
- M2: repository intelligence and context
- M3: plugins and execution
- M4: CLI, daemon, and dashboard
- M5: security, release, and self-hosting
- M6: Conflict Impact Atlas dogfood
