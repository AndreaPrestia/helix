import { DomainError } from '@helix/core';

/** Base class for AI provider failures — structured, never thrown silently. */
export abstract class ProviderError extends DomainError {}

/** Raised when a requested model is not offered by the provider. */
export class ModelNotFoundError extends ProviderError {
  readonly code = 'PROVIDER_MODEL_NOT_FOUND';

  constructor(readonly model: string) {
    super(`unknown model: ${model}`);
  }
}

/** Raised when a completion request is malformed. */
export class InvalidRequestError extends ProviderError {
  readonly code = 'PROVIDER_INVALID_REQUEST';
}
