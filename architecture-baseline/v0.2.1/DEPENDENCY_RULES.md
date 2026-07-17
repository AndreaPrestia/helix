# Dependency Rules

The machine-readable authority is `reference/architecture/allowed-dependencies.yaml` and `reference/architecture/package-dependency-rules.json`.

## Universal rules

- Dependencies MUST be acyclic.
- Cross-package imports MUST use package public entry points.
- `internal` folders MUST NOT be imported across package boundaries.
- Domain packages MUST NOT depend on application or infrastructure packages.
- Apps are composition roots and may depend on packages; packages MUST NOT depend on apps.
- Plugins depend on the plugin SDK and public capability contracts, never on application internals.
- Provider-specific code MUST remain outside provider-agnostic packages.

## Core isolation

`@helix/core` MUST NOT import Node built-ins or packages for filesystem, network, databases, Git, UI, telemetry transports, or AI providers.

## Enforcement

Architecture tests are release-blocking. A change that needs a forbidden edge requires architecture evolution and cannot waive the rule locally.
