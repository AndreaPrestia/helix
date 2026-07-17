import { describe, expect, it } from 'vitest';
import { noSnapshotPolicy, shouldWriteSnapshot, type SnapshotPolicy } from './policy.js';

describe('shouldWriteSnapshot', () => {
  const policy: SnapshotPolicy = { interval: 5, minVersion: 3, rebuildOnFallback: false };

  it('writes once the interval has elapsed since the last snapshot', () => {
    expect(shouldWriteSnapshot(policy, 8, 3)).toBe(true);
    expect(shouldWriteSnapshot(policy, 7, 3)).toBe(false);
  });

  it('never writes below the minimum version', () => {
    expect(shouldWriteSnapshot(policy, 2, 0)).toBe(false);
  });

  it('never writes when the interval is disabled', () => {
    expect(
      shouldWriteSnapshot({ interval: 0, minVersion: 0, rebuildOnFallback: false }, 100, 0),
    ).toBe(false);
    expect(shouldWriteSnapshot(noSnapshotPolicy, 100, 0)).toBe(false);
  });
});
