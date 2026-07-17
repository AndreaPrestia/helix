# Helix System Overview

Helix is organised as a provider-agnostic core with replaceable adapters.

```text
Workspace
  ↓
Manifest Loader
  ↓
Specification Registry
  ↓
Context Resolver
  ↓
Execution Planner
  ↓
Provider Adapter
  ↓
Review and Quality Gates
  ↓
Repository Change / Pull Request
```

## Planned packages

- `core`: shared domain and orchestration abstractions.
- `workspace`: repository discovery and manifest loading.
- `specification`: OpenSpec registry and traceability.
- `validation`: schema and rule validation.
- `context-builder`: deterministic context resolution.
- `generators`: workspace/spec/task generation.
- `graph`: relationship and dependency graph.
- `review`: review pipelines and quality results.
- `providers`: AI provider abstractions.
- `plugins`: GitHub, Claude, Docker and CI adapters.

The first foundation release specifies these boundaries without implementing the
complete runtime.
