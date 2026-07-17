import { appendFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type DomainEvent, type Result, err, ok } from '@helix/core';
import {
  type EventStore,
  STREAM_ID_PATTERN,
  type StoredEvent,
  type StreamWrite,
} from './event-store.js';
import {
  type EventStoreError,
  InvalidStreamIdError,
  StoreCorruptionError,
} from './store-errors.js';
import { stageWrites } from './stage.js';

interface SerializedEvent {
  readonly eventId: string;
  readonly name: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly payload: unknown;
}

interface PersistedRecord {
  readonly sequence: number;
  readonly streamId: string;
  readonly version: number;
  readonly event: SerializedEvent;
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStoredEvent(value: unknown): StoredEvent | null {
  if (!isRecord(value) || !isRecord(value.event)) {
    return null;
  }
  const { sequence, streamId, version, event } = value as Partial<PersistedRecord> & {
    event?: Record<string, unknown>;
  };
  if (
    typeof sequence !== 'number' ||
    typeof streamId !== 'string' ||
    typeof version !== 'number' ||
    event === undefined
  ) {
    return null;
  }
  const { eventId, name, aggregateId, occurredAt, payload } = event as Record<string, unknown>;
  if (
    typeof eventId !== 'string' ||
    typeof name !== 'string' ||
    typeof aggregateId !== 'string' ||
    typeof occurredAt !== 'string'
  ) {
    return null;
  }
  const occurred = new Date(occurredAt);
  if (Number.isNaN(occurred.getTime())) {
    return null;
  }
  const domainEvent: DomainEvent = { eventId, name, aggregateId, occurredAt: occurred, payload };
  return { sequence, streamId, version, event: domainEvent };
}

function serialize(record: StoredEvent): string {
  const persisted: PersistedRecord = {
    sequence: record.sequence,
    streamId: record.streamId,
    version: record.version,
    event: {
      eventId: record.event.eventId,
      name: record.event.name,
      aggregateId: record.event.aggregateId,
      occurredAt: record.event.occurredAt.toISOString(),
      payload: record.event.payload,
    },
  };
  return `${JSON.stringify(persisted)}\n`;
}

/**
 * A JSONL filesystem {@link EventStore} (ADR-0020). Each stream is stored as a
 * `<streamId>.jsonl` file, one JSON record per line. Optimistic concurrency and
 * atomic multi-stream validation are enforced against a consistent snapshot read
 * from disk; corrupt lines are reported explicitly rather than silently ignored
 * (Constitution Article 7). Intended for a single-process local store.
 */
export class JsonlEventStore implements EventStore {
  readonly #dir: string;

  constructor(directory: string) {
    this.#dir = directory;
  }

  appendToStream(write: StreamWrite): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    return this.appendToStreams([write]);
  }

  async appendToStreams(
    writes: readonly StreamWrite[],
  ): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    const state = await this.#loadState();
    if (!state.ok) {
      return state;
    }
    const { counts, maxSequence } = state.value;
    const staged = stageWrites(writes, (streamId) => counts.get(streamId) ?? 0, maxSequence);
    if (!staged.ok) {
      return staged;
    }

    const byStream = new Map<string, StoredEvent[]>();
    for (const record of staged.value) {
      const group = byStream.get(record.streamId) ?? [];
      group.push(record);
      byStream.set(record.streamId, group);
    }

    await mkdir(this.#dir, { recursive: true });
    for (const [streamId, records] of byStream) {
      const payload = records.map(serialize).join('');
      await appendFile(this.#file(streamId), payload, 'utf8');
    }
    return ok(staged.value);
  }

  async readStream(streamId: string): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    if (!STREAM_ID_PATTERN.test(streamId)) {
      return err(new InvalidStreamIdError(streamId));
    }
    const parsed = await this.#readFile(streamId);
    if (!parsed.ok) {
      return parsed;
    }
    return ok([...parsed.value].sort((a, b) => a.version - b.version));
  }

  async readAll(): Promise<Result<readonly StoredEvent[], EventStoreError>> {
    const all = await this.#readAllRecords();
    if (!all.ok) {
      return all;
    }
    return ok([...all.value].sort((a, b) => a.sequence - b.sequence));
  }

  #file(streamId: string): string {
    return join(this.#dir, `${streamId}.jsonl`);
  }

  async #readFile(streamId: string): Promise<Result<StoredEvent[], EventStoreError>> {
    let content: string;
    try {
      content = await readFile(this.#file(streamId), 'utf8');
    } catch (error) {
      if (hasCode(error, 'ENOENT')) {
        return ok([]);
      }
      throw error;
    }

    const records: StoredEvent[] = [];
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = (lines[index] ?? '').trim();
      if (line === '') {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        return err(new StoreCorruptionError(streamId, `invalid JSON on line ${index + 1}`));
      }
      const record = toStoredEvent(parsed);
      if (record === null) {
        return err(new StoreCorruptionError(streamId, `malformed record on line ${index + 1}`));
      }
      records.push(record);
    }
    return ok(records);
  }

  async #readAllRecords(): Promise<Result<StoredEvent[], EventStoreError>> {
    let entries: string[];
    try {
      entries = await readdir(this.#dir);
    } catch (error) {
      if (hasCode(error, 'ENOENT')) {
        return ok([]);
      }
      throw error;
    }

    const records: StoredEvent[] = [];
    for (const entry of entries.filter((name) => name.endsWith('.jsonl')).sort()) {
      const streamId = entry.slice(0, -'.jsonl'.length);
      const parsed = await this.#readFile(streamId);
      if (!parsed.ok) {
        return parsed;
      }
      records.push(...parsed.value);
    }
    return ok(records);
  }

  async #loadState(): Promise<
    Result<{ counts: Map<string, number>; maxSequence: number }, EventStoreError>
  > {
    const all = await this.#readAllRecords();
    if (!all.ok) {
      return all;
    }
    const counts = new Map<string, number>();
    let maxSequence = 0;
    for (const record of all.value) {
      counts.set(record.streamId, Math.max(counts.get(record.streamId) ?? 0, record.version));
      maxSequence = Math.max(maxSequence, record.sequence);
    }
    return ok({ counts, maxSequence });
  }
}
