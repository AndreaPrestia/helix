# Design: Security model hardening

## Context
Read the baseline specification targets: `security/security-model` and all referenced ADRs before editing code.

## Design constraints
- Native ESM and strict TypeScript.
- Explicit constructor injection and composition roots.
- No hidden global registries.
- Errors are typed and observable.
- Public APIs are exported only from package entry points.
- Deterministic behavior is tested with fake clocks and ID generators.

## Implementation strategy
1. Add or refine ports and domain contracts.
2. Implement the smallest complete vertical behavior.
3. Add unit and contract tests.
4. Add architecture or golden tests where applicable.
5. Update package contract and documentation.

## Risks
- Scope expansion into later changes.
- Accidental infrastructure dependency in core packages.
- Non-deterministic ordering or identifier generation.
