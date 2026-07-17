# Helix Domain Model

```text
Workspace
  └── Project
        ├── Specification
        │     └── Requirement
        ├── Epic
        │     └── Task
        │           └── Review
        ├── ADR
        ├── Knowledge
        ├── ContextManifest
        ├── QualityGate
        └── Release

AgentRole ──executed by──> Provider
Plugin ──extends──> Helix
KnowledgeGraph ──connects──> traceable artifacts
DomainEvent ──records──> state transitions
```

Aggregate boundaries:

- Workspace is the governance root.
- Project is the operational delivery aggregate.
- Specification owns Requirements.
- Task owns execution evidence.
- Review owns findings and gate results.
- Knowledge Graph stores references, not mutable aggregate copies.
