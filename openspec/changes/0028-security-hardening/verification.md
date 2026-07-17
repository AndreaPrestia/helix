# Verification: Security model hardening

## Command evidence

```text
corepack pnpm install                       INSTALL=0
corepack pnpm lint                          LINT=0   (eslint ., no findings)
corepack pnpm exec turbo run typecheck      Tasks: 21 successful, 21 total   EXIT=0
corepack pnpm test                          Test Files 63 passed (63) / Tests 448 passed (448)   TEST=0
corepack pnpm architecture:test             Tests 23 passed (23)   ARCH=0
corepack pnpm exec turbo run build          Tasks: 16 successful, 16 total   BUILD=0
corepack pnpm install --frozen-lockfile     FROZEN=0
corepack pnpm format:check                  All matched files use Prettier code style!   FMT=0
```

## Requirement → evidence (security/security-model)

| Requirement | Implementation | Tests |
| --- | --- | --- |
| threat model | `packages/application/src/threat-model.ts` — `ThreatModel` (STRIDE categories, validated registration, category/unmitigated filters, coverage ratio) | `threat-model.test.ts` (register/list, duplicate, invalid fields, filters, coverage) |
| secret handling | `packages/application/src/secret.ts` — `Secret` (redacted toString/toJSON, explicit `reveal`) + `redactSecrets` scrubber | `secret.test.ts` (never exposes via toString/JSON, explicit reveal, literal redaction, no over-redaction) |
| plugin trust | `packages/application/src/plugin-trust.ts` — `PluginTrustEvaluator` (deny-by-default: minimum trust + permissions allowed at level with inheritance) | `plugin-trust.test.ts` (grant with inheritance, below-minimum denial, permission denial, empty set) |
| tool authorization | `packages/application/src/tool-authorization.ts` — `ToolAuthorizer` (deny-by-default allowlist) | `tool-authorization.test.ts` (granted, denied, sorted grants, side-effect-free check) |
| audit trail | `packages/application/src/audit-trail.ts` — `AuditTrail` (append-only, monotonic sequence, previous-id chain, `verifyChain`, injected Clock/IdGenerator) | `audit-trail.test.ts` (immutable sequenced entries, order + since, chain integrity, defensive copy) |

## Acceptance evidence
- [x] Requirements mapped to tests.
- [x] Tests pass.
- [x] Architecture rules pass.
- [x] No unapproved dependency introduced.
- [ ] Reviewer findings resolved.

## Deviations
- **Housed in the declared `application` package.** The ruleset has no `security` package,
  so the security-model vertical is implemented in `packages/application` (`@helix/application`),
  the declared application-services layer (allowed deps `@helix/core`, `@helix/events`). This
  satisfies the declared-responsibilities and allowed-dependency gates. The shipped package
  depends on `@helix/core` only (a subset of the allowance).
- **Decoupled from plugin-sdk / execution.** Plugin trust and tool authorization operate on
  plain descriptor/request DTOs rather than importing `@helix/plugin-sdk` or `@helix/execution`
  (which the ruleset would not permit here). The composition layer adapts real plugin/tool
  data into these inputs.
- **Deterministic, dependency-free primitives.** Redaction and the audit chain use no crypto
  or Node built-ins; the audit trail is deterministic via injected `Clock`/`IdGenerator` and
  is tamper-evident through contiguous sequences and previous-id links.

## Residual risks
- **Reference-data taxonomy inconsistency.** `package-dependency-rules.json` (enforced),
  `allowed-dependencies.yaml`, and `system-overview.md` still describe the package set
  differently; unchanged by this change and tracked for a future governance correction.
- **Independent review / archival pending.** "Reviewer findings resolved" stays unchecked;
  the change awaits review before acceptance and archival.
