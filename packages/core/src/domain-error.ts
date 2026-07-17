/**
 * Base class for all domain errors.
 *
 * Domain errors are explicit, typed, and observable (Constitution Article 7).
 * They never depend on infrastructure and carry a stable machine-readable
 * {@link DomainError.code} in addition to a human-readable message.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable error code. */
  abstract readonly code: string;

  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Raised when a domain invariant would be violated. */
export class InvariantViolation extends DomainError {
  readonly code = 'INVARIANT_VIOLATION';
}

/** Raised when a value fails validation while constructing a domain object. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}
