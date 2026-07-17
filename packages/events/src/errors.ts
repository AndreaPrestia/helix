import { DomainError } from '@helix/core';

/** A single handler failure captured during dispatch. */
export interface HandlerFailure {
  readonly eventName: string;
  readonly error: unknown;
}

/**
 * Raised when one or more handlers fail while dispatching an event. The failure
 * is explicit and never hidden behind a successful publish (Constitution
 * Article 7); the event is still recorded because it did occur.
 */
export class HandlerDispatchError extends DomainError {
  readonly code = 'HANDLER_DISPATCH_ERROR';

  constructor(readonly failures: readonly HandlerFailure[]) {
    super(`${failures.length} handler(s) failed during dispatch`);
  }
}
