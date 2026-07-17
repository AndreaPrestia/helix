# Contributing

All work must be traceable to an approved specification and task.

## Required flow

1. Identify or create the relevant OpenSpec.
2. Create or update the execution plan.
3. Create an atomic task.
4. Build the task context using the relevant context manifest.
5. Implement on a short-lived branch.
6. Run all declared quality gates.
7. Update specifications, ADRs and knowledge when behaviour changes.
8. Open a pull request using the repository template.

## Prohibited

- Undocumented architectural changes.
- Business logic in transport or persistence adapters.
- Secrets committed to the repository.
- Unversioned generated artifacts.
- Silent changes to public contracts.
