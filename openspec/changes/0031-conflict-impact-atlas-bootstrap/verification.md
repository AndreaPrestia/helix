# Verification: First external dogfood

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 24 successful, 24 total   EXIT=0
corepack pnpm test                          Test Files 73 passed (73) / Tests 493 passed (493)   TEST=0
corepack pnpm architecture:test             Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 19 successful, 19 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Built-binary smoke test (helix-atlas-bootstrap <spec.json> in a temp dir)
node .../apps/atlas-bootstrap/dist/main.js spec.json
  { "ok": true, "result": {
      "project": { "name": "conflict-atlas",
        "created": ["conflict-atlas/README.md", ".../helix.config.json",
                    "conflict-atlas/src/domain/conflict-atlas.ts"] },
      "importedKnowledge": [{ id: "k-1", source: "retained" }],
      "openspec": ["conflict-atlas/openspec/project.md",
                   ".../specs/conflict-registry/spec.md", …],
      "firstChange": { id: "0001-bootstrap", status: "proposed" } } }        EXIT=0
```

## Requirement → evidence (dogfood/conflict-impact-atlas)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| initialize project with Helix | `apps/atlas-bootstrap/src/bootstrap.ts` — `AtlasBootstrap.bootstrap` writes a project scaffold (README, `helix.config.json`) non-destructively | `bootstrap.test.ts` "initializes the project…", "is non-destructive…" |
| import retained product knowledge | `#importKnowledge` — validates + de-duplicates knowledge, tags `source: retained`, id-sorted | `bootstrap.test.ts` importedKnowledge assertion, "rejects duplicate knowledge ids" |
| generate project-local OpenSpec | `#openspecFiles` — generates `openspec/project.md`, `specs/<cap>/spec.md`, and the first change's files | `bootstrap.test.ts` openspec paths assertion |
| run first governed change | first change staged as `{ id, title, status: 'proposed' }` with proposal/tasks/change.yaml | `bootstrap.test.ts` firstChange assertion |
| keep product domain outside Helix core | `isCorePath` guard rejects any artifact targeting a Helix core namespace (`DomainLeakError`); the product domain (`conflict-atlas.ts`) imports nothing from `@helix/*` | `bootstrap.test.ts` "refuses to place a product artifact inside Helix core", `isCorePath` tests; `conflict-atlas.test.ts` (standalone product domain) |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **`apps/` composition root.** The external-dogfood bootstrap is implemented as
  `apps/atlas-bootstrap` (`@helix/atlas-bootstrap`, `helix-atlas-bootstrap` bin) — app-exempt
  from declared-responsibilities while public-entry rules still apply. Depends on `@helix/core`
  only; no third-party dependency.
- **Product domain lives in the product project, not Helix core.** The Conflict Impact Atlas
  domain (`src/conflict-atlas.ts`) is self-contained and imports nothing from `@helix/*`; the
  bootstrapper additionally refuses (via `isCorePath`) to write any product artifact into a
  Helix core namespace. This enforces the "keep product domain outside Helix core" requirement
  both statically (no import) and dynamically (placement guard).
- **Deterministic, POSIX paths; filesystem behind a port.** The orchestrator joins paths with
  `/` and writes through an injected `FileSink` (non-destructive), so it is fully unit-tested;
  `main.ts` supplies the Node fs adapter and is smoke-tested via the built binary.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
