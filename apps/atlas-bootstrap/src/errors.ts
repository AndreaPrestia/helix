/** Base class for all bootstrap errors. Every error carries a stable `code`. */
export abstract class BootstrapError extends Error {
  abstract readonly code: string;
}

/** Raised when a bootstrap input is invalid (e.g. empty project name). */
export class BootstrapValidationError extends BootstrapError {
  readonly code = 'BOOTSTRAP_VALIDATION';
  constructor(readonly issues: readonly string[]) {
    super(`invalid bootstrap input: ${issues.join('; ')}`);
  }
}

/** Raised when bootstrap would overwrite an existing file (non-destructive). */
export class FileExistsError extends BootstrapError {
  readonly code = 'FILE_EXISTS';
  constructor(readonly path: string) {
    super(`refusing to overwrite existing file "${path}"`);
  }
}

/**
 * Raised when a product artifact would be placed inside a Helix core namespace,
 * violating the rule that product domain stays outside Helix core.
 */
export class DomainLeakError extends BootstrapError {
  readonly code = 'DOMAIN_LEAK';
  constructor(readonly path: string) {
    super(`product artifact "${path}" must not live inside a Helix core namespace`);
  }
}
