import type { EventEnvelope } from '../envelope.js';
import type { OutboxRecord, OutboxStatus, OutboxStore } from './outbox-store.js';

/** A deterministic in-memory {@link OutboxStore} reference implementation. */
export class InMemoryOutboxStore implements OutboxStore {
  readonly #records = new Map<string, OutboxRecord>();

  async enqueue(envelope: EventEnvelope): Promise<OutboxRecord> {
    const id = envelope.event.eventId;
    const existing = this.#records.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const record: OutboxRecord = { id, envelope, status: 'pending', attempts: 0 };
    this.#records.set(id, record);
    return record;
  }

  async list(status: OutboxStatus): Promise<readonly OutboxRecord[]> {
    return [...this.#records.values()].filter((record) => record.status === status);
  }

  async save(record: OutboxRecord): Promise<void> {
    this.#records.set(record.id, record);
  }
}
