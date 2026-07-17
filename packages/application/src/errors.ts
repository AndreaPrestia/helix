import { DomainError } from '@helix/core';

/** Raised when a registered threat is invalid or duplicates an existing id. */
export class ThreatValidationError extends DomainError {
  readonly code = 'THREAT_VALIDATION';
  constructor(readonly issues: readonly string[]) {
    super(`invalid threat: ${issues.join('; ')}`);
  }
}

/** Raised when a plugin is denied because it is not sufficiently trusted. */
export class TrustDeniedError extends DomainError {
  readonly code = 'TRUST_DENIED';
  constructor(
    readonly pluginId: string,
    readonly reasons: readonly string[],
  ) {
    super(`plugin "${pluginId}" denied: ${reasons.join('; ')}`);
  }
}

/** Raised when a tool invocation is not authorized (deny-by-default). */
export class ToolAuthorizationError extends DomainError {
  readonly code = 'TOOL_UNAUTHORIZED';
  constructor(readonly tool: string) {
    super(`tool "${tool}" is not authorized`);
  }
}
