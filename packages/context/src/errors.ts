import { DomainError } from '@helix/core';

/** Base class for context-engine failures. */
export abstract class ContextError extends DomainError {}

/** Raised when a manifest is structurally invalid. */
export class InvalidManifestError extends ContextError {
  readonly code = 'INVALID_CONTEXT_MANIFEST';
}

/** Raised when a manifest contains two candidates with the same id. */
export class DuplicateCandidateError extends ContextError {
  readonly code = 'DUPLICATE_CONTEXT_CANDIDATE';

  constructor(readonly candidateId: string) {
    super(`duplicate context candidate: ${candidateId}`);
  }
}
