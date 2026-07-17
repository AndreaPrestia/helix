# Verification: Helix self-hosting milestone

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 23 successful, 23 total   EXIT=0
corepack pnpm test                          Test Files 71 passed (71) / Tests 483 passed (483)   TEST=0
corepack pnpm architecture:test             Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 18 successful, 18 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Dogfood smoke test (helix-self-hosting reads Helix's own specs)
node apps/self-hosting/dist/main.js 0030-self-hosting --override
  { "ok": true, "report": {
      "changeId": "0030-self-hosting", "approved": false, "overridden": true,
      "plan": { steps: [ …0030 tasks as bounded plan steps… ] }, … } }        EXIT=0
```

## Requirement → evidence (dogfood/self-hosting)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| Helix reads its own specs | `apps/self-hosting/src/workflow.ts` reads a change via the `SpecReader` port; `src/main.ts` backs it with `@helix/governance` `OpenSpecEngine` over `./openspec` | `workflow.test.ts` "reads a change… rejects an unknown change"; dogfood smoke test read 0030's own tasks |
| Helix creates bounded plans | `apps/self-hosting/src/bounded-planner.ts` — `BoundedPlanner` caps steps at a budget, rejecting empty/oversized plans | `bounded-planner.test.ts` (indexed steps, trim/drop blanks, empty rejection, over-budget rejection); `workflow.test.ts` bounded plan |
| Claude executes approved changes | `SelfHostingWorkflow.run` executes plan steps via the `ChangeExecutor` port only for an approved change; unapproved → `NotApprovedError` | `workflow.test.ts` "executes an approved change", "refuses… without an override" |
| review evidence is captured | `apps/self-hosting/src/review-log.ts` — append-only `ReviewLog`; the workflow captures evidence (approval + findings) each run | `review-log.test.ts` (capture/latest/order); `workflow.test.ts` "captures review evidence with findings when a step fails" |
| manual override remains possible | `RunOptions.manualOverride` authorizes execution of an unapproved change, recorded explicitly (`overridden`, `reviewer: manual-override`) | `workflow.test.ts` "allows a manual override, recorded explicitly"; dogfood run with `--override` |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **`apps/` composition root.** Self-hosting is the dogfooding orchestration and reads
  Helix's own specs via governance, so it is implemented as `apps/self-hosting`
  (`@helix/self-hosting`, `helix-self-hosting` bin) — app-exempt from declared-responsibilities
  while public-entry rules still apply. Dependencies: `@helix/core`, `@helix/governance`; no
  third-party dependency.
- **Execution delegated to the agent runtime.** The `ChangeExecutor` port abstracts the
  Claude/agent boundary; the workflow is fully unit-tested with fake executors. The binary's
  runtime executor records each step as *delegated to the agent runtime* rather than
  fabricating a result — the report honestly reflects that actual code execution happens
  outside this process.
- **Approval derived from change status.** The runtime treats `accepted`/`completed` changes
  as approved; the workflow itself is status-agnostic (approval is a boolean input), keeping
  it decoupled from any particular governance vocabulary.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
