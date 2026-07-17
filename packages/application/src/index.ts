/**
 * `@helix/application` — application-level security services.
 *
 * Hardens the Helix security model: a STRIDE threat registry, secret handling
 * with mandatory redaction, deny-by-default plugin trust evaluation and tool
 * authorization, and an append-only, chained audit trail. Depends only on
 * `@helix/core`; security decisions are deterministic, typed, and testable.
 */

export { ThreatValidationError, TrustDeniedError, ToolAuthorizationError } from './errors.js';
export {
  threatCategories,
  ThreatModel,
  type ThreatCategory,
  type MitigationStatus,
  type Threat,
} from './threat-model.js';
export { Secret, redactSecrets, REDACTION_PLACEHOLDER } from './secret.js';
export {
  trustLevels,
  PluginTrustEvaluator,
  type TrustLevel,
  type PluginDescriptor,
  type TrustPolicy,
  type GrantedTrust,
} from './plugin-trust.js';
export { ToolAuthorizer, type ToolRequest, type ToolGrant } from './tool-authorization.js';
export {
  AuditTrail,
  type AuditOutcome,
  type AuditRequest,
  type AuditEntry,
} from './audit-trail.js';
