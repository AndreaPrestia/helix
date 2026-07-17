# Verification: Release engine

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 22 successful, 22 total   EXIT=0
corepack pnpm test                          Test Files 68 passed (68) / Tests 470 passed (470)   TEST=0
corepack pnpm architecture:test             Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 17 successful, 17 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0

# Built-binary smoke test (helix-release <spec.json>)
node apps/release/dist/main.js rel.json
  { "ok": true, "plan": {
      "version": "0.4.0", "bump": "minor",
      "changelog": { features: [0029 …] },
      "manifest": { artifacts: [helix.tgz sha256…], digest: "d101b7…" },
      "signature": { "signed": false, "signer": "none" } } }        EXIT=0
```

## Requirement → evidence (release/release-engine)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| version calculation | `apps/release/src/version.ts` — `parseVersion`/`formatVersion`, `bumpFromChanges` (highest wins), `applyBump`, `calculateNextVersion` | `version.test.ts` (parse/format, bump selection, per-level bumps, next version) |
| changelog evidence | `apps/release/src/changelog.ts` — `buildChangelog` requires non-empty title + evidence per change; grouped, id-sorted | `changelog.test.ts` (grouping, missing evidence rejection, missing title rejection) |
| quality gate enforcement | `apps/release/src/release-engine.ts` — `ReleaseEngine.release` evaluates a `@helix/governance` `QualityGate` first; failure → `ReleaseBlockedError` | `release-engine.test.ts` "blocks the release when the quality gate fails"; passing-gate plan |
| artifact manifest | `apps/release/src/artifact-manifest.ts` — `buildManifest` (unique names, per-artifact SHA-256 + bytes, deterministic manifest digest) | `artifact-manifest.test.ts` (deterministic/name-sorted, content-sensitive digest, empty-name & duplicate rejection) |
| signed release extension point | `apps/release/src/signing.ts` — `ReleaseSigner` port + default `NullSigner` (explicitly unsigned); engine applies the injected signer | `signing.test.ts` (unsigned result); `release-engine.test.ts` "uses a pluggable signer extension point" |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **`apps/` composition root.** No `release` package exists in the ruleset, and the engine
  enforces quality gates (needs `@helix/governance`), so it is implemented as `apps/release`
  (`@helix/release`, `helix-release` bin) — app-exempt from declared-responsibilities while
  public-entry rules still apply. Dependencies: `@helix/core`, `@helix/governance` (existing
  workspace packages); no third-party dependency.
- **Signing is an extension point, not a built-in vendor.** Per the spec Non-goal against
  vendor coupling, the release ships with a `NullSigner` (explicitly unsigned) and a
  `ReleaseSigner` port; a deployment plugs in its own KMS/cosign/GPG signer.
- **Deterministic manifest via Node `crypto`.** Artifact digests use `node:crypto` SHA-256
  (the app declares `types: ["node"]`); given the same artifacts the manifest digest is
  stable (verified by test).
- **`main.ts` excluded from unit tests.** The bin only reads a spec file and prints the plan;
  all engine behaviour lives in unit-tested modules and is smoke-tested via the built binary.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
