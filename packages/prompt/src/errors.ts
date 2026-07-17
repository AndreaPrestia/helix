import { DomainError } from '@helix/core';

/** Base class for prompt-compiler failures. */
export abstract class PromptError extends DomainError {}

/** Raised when a prompt section is invalid (unknown kind or empty content). */
export class InvalidSectionError extends PromptError {
  readonly code = 'INVALID_PROMPT_SECTION';
}
