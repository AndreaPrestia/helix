import { DomainError } from '@helix/core';

/** Raised when a metrics input is invalid (e.g. negative counts, covered > total). */
export class MetricsValidationError extends DomainError {
  readonly code = 'METRICS_VALIDATION';
  constructor(readonly issues: readonly string[]) {
    super(`invalid metrics input: ${issues.join('; ')}`);
  }
}
