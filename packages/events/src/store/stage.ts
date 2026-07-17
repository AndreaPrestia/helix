import type { DomainEvent, Result } from '@helix/core';
import { err, ok } from '@helix/core';
import { STREAM_ID_PATTERN, type StoredEvent, type StreamWrite } from './event-store.js';
import { ConcurrencyError, type EventStoreError, InvalidStreamIdError } from './store-errors.js';

/**
 * Validate a batch of writes against the current stream versions and assign
 * per-stream versions and global sequences. Pure and side-effect free: callers
 * commit the returned records only when the result is `ok`, giving all-or-nothing
 * (atomic) semantics for multi-stream appends. Optimistic concurrency is
 * enforced per stream, accounting for multiple writes to the same stream within
 * one batch.
 */
export function stageWrites(
  writes: readonly StreamWrite[],
  currentVersion: (streamId: string) => number,
  startSequence: number,
): Result<StoredEvent[], EventStoreError> {
  const staged: StoredEvent[] = [];
  const workingLength = new Map<string, number>();
  let sequence = startSequence;

  for (const write of writes) {
    if (!STREAM_ID_PATTERN.test(write.streamId)) {
      return err(new InvalidStreamIdError(write.streamId));
    }
    const base = workingLength.get(write.streamId) ?? currentVersion(write.streamId);
    if (write.expectedVersion !== base) {
      return err(new ConcurrencyError(write.streamId, write.expectedVersion, base));
    }
    let version = base;
    for (const event of write.events) {
      version += 1;
      sequence += 1;
      staged.push({ sequence, streamId: write.streamId, version, event: event as DomainEvent });
    }
    workingLength.set(write.streamId, version);
  }

  return ok(staged);
}
