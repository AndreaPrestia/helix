# Architecture Baseline v0.2.1

**Status:** Frozen  
**Scope:** Helix implementation changes `0001` through `0031` unless superseded through the architecture-evolution process.

## Platform identity

Helix is an AI-native software engineering platform composed of Governance, Knowledge, Repository Intelligence, Execution, and Plugin capabilities. AI providers are replaceable tools, not the architectural center.

## Frozen principles

1. Repository as source of truth.
2. Domain-first design with rich aggregates.
3. Ports & Adapters and explicit composition roots.
4. Event-driven integration with deterministic orchestration.
5. Provider-agnostic core.
6. Plugin-first extensibility through versioned capability contracts.
7. Public package APIs; no cross-package deep imports.
8. Acyclic package dependencies.
9. Traceability from requirement to release.
10. OpenSpec governs changes; ordinary implementation changes apply architecture rather than redefine it.

## Frozen stack

- TypeScript 5.x, strict mode
- Node.js 22 LTS
- pnpm workspace
- Turborepo
- native ESM
- tsup
- Vitest
- ESLint flat config
- Prettier
- GitHub Actions
- Docker

## Platform engines

- Core Engine
- Governance Engine
- Knowledge Engine
- Repository Engine
- Execution Engine
- Plugin Engine

Engines communicate through public contracts, ports, capabilities, and domain/integration events. They do not bypass dependency rules.

## Evolution rule

This baseline can be replaced only by: RFC → accepted ADRs → new versioned baseline → migration plan → explicit approval. Existing changes continue to target this baseline unless individually migrated.
