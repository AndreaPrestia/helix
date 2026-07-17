import { type Result, err, ok } from '@helix/core';
import {
  type EventStore,
  STREAM_ID_PATTERN,
  type StoredEvent,
  type StreamWrite,
} from './event-store.js';
import { type EventStoreError, InvalidStreamIdError } from './store-errors.js';
import { stageWrites } from './stage.js';

/**
 * A deterministic in-memory {@link EventStore}. Useful as a reference
 * implementation and for tests; durable adapters implement the same contract.
 */
export class InMemoryEventStore implements EventStore {
  readonly #streams = new Map<string, StoredEvent[]>();
  readonly #all: StoredEvent[] = [];

  appendToStream(write: StreamWrite): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    return this.appendToStreams([write]);
  }

  async appendToStreams(
    writes: readonly StreamWrite[],
  ): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    const staged = stageWrites(
      writes,
      (streamId) => this.#streams.get(streamId)?.length ?? 0,
      this.#all.length,
    );
    if (!staged.ok) {
      return staged;
    }
    for (const record of staged.value) {
      const stream = this.#streams.get(record.streamId) ?? [];
      stream.push(record);
      this.#streams.set(record.streamId, stream);
      this.#all.push(record);
    }
    return ok(staged.value);
  }

  async readStream(streamId: string): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    if (!STREAM_ID_PATTERN.test(streamId)) {
      return err(new InvalidStreamIdError(streamId));
    }
    return ok([...(this.#streams.get(streamId) ?? [])]);
  }

  async readAll(): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    return ok([...this.#all]);
  }
}
