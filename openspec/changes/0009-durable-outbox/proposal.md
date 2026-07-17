# Proposal: Durable dispatch and outbox

## Status
Proposed

## Why
This change delivers the next bounded capability in the approved Helix roadmap.

## Scope
Implement the behavior defined by: `runtime/outbox`.

## Dependencies
- `0008-snapshot-runtime`

## Out of scope
- Later roadmap capabilities.
- Unapproved vendor coupling.
- Refactoring unrelated packages.

## Success criteria
- All delta requirements are implemented.
- Tests prove scenarios and invariants.
- Typecheck, lint, architecture tests, and relevant integration tests pass.
- Documentation and public exports are updated.
