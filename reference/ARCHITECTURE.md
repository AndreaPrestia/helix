# Helix Architecture

Helix is an AI-native software engineering platform, not an AI-agent framework.

## Platform planes

1. Governance decides what is allowed.
2. Knowledge decides what must be known.
3. Execution performs governed work.

## Dependency direction

`apps → application → engine contracts → core`

Adapters and plugins depend on contracts; contracts never depend on adapters.

## Principal engines

Core, Governance, Knowledge, Repository, Execution and Plugin.

## Non-negotiable rules

- No circular package dependencies.
- No deep imports across packages.
- Core imports no Node.js or infrastructure modules.
- Plugins do not depend on other plugins.
- Public APIs are exported through package roots.
- Orchestration is deterministic and testable.

## Transactional snapshot coordination

The event store is the transactional boundary. A coordinated commit performs:

1. atomic optimistic-concurrency validation and multi-stream append;
2. aggregate commit marking;
3. best-effort snapshot materialization for eligible committed versions;
4. downstream event dispatch.

Snapshot and dispatch errors are explicit post-commit outcomes. They never imply that authoritative events were rolled back.
