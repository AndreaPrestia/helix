import { DomainError } from '@helix/core';

/** Base class for durable event-store failures. */
export abstract class EventStoreError extends DomainError {}

/** Raised when an append's expected version does not match the stored version. */
export class ConcurrencyError extends EventStoreError {
  readonly code = 'CONCURRENCY_CONFLICT';

  constructor(
    readonly streamId: string,
    readonly expectedVersion: number,
    readonly actualVersion: number,
  ) {
    super(`stream "${streamId}": expected version ${expectedVersion} but found ${actualVersion}`);
  }
}

/** Raised when a stream identifier is not a safe, storable value. */
export class InvalidStreamIdError extends EventStoreError {
  readonly code = 'INVALID_STREAM_ID';

  constructor(readonly streamId: string) {
    super(`invalid stream id: "${streamId}"`);
  }
}

/** Raised when persisted stream data cannot be parsed (corruption). */
export class StoreCorruptionError extends EventStoreError {
  readonly code = 'STORE_CORRUPTION';

  constructor(
    readonly streamId: string,
    readonly detail: string,
  ) {
    super(`stream "${streamId}": ${detail}`);
  }
}
