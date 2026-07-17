# Initial Claude prompt — start Helix implementation

Use this from the repository root after copying this pack into the Helix repository:

```text
You are the implementation agent for Helix. Work strictly under CLAUDE.md and IMPLEMENTATION_CONTRACT.md. The frozen architecture baseline is architecture-baseline/v0.2.1 and you are not authorized to modify or reinterpret it.

Read the mandatory documents in their prescribed order. Inspect the entire current repository, including any code already implemented before this OpenSpec pack was added. Determine the first incomplete eligible change from execution/change-status.yaml and openspec/implementation-roadmap.md; normally this is openspec/changes/0001-workspace-bootstrap, but do not redo behavior that is already correctly implemented.

Before editing, produce:
1. a gap analysis mapping every task and acceptance criterion of the active change to existing evidence or missing work;
2. the architecture constraints and ADRs that apply;
3. a concise file-level implementation plan;
4. the exact verification commands you will run.

Then implement only that one change. Reuse compliant existing code, repair non-compliant code inside the change scope, and avoid unrelated refactoring. Add or update automated tests for every mandatory behavior. Run all available quality gates and record actual outputs. Never fabricate success when a command cannot run.

Update the active change's tasks.md, verification.md, and execution/change-status.yaml only according to real evidence. Stop after the active change and provide the final report required by IMPLEMENTATION_CONTRACT.md. Do not begin or prepare implementation of the next change.
```
