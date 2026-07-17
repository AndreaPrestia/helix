/**
 * Snapshot creation policy (ADR-0025). Cadence, minimum version, and repair
 * behavior are application-level concerns and live outside the domain
 * (ADR-0028); no aggregate decides when snapshots are written.
 */
export interface SnapshotPolicy {
  /** Write a snapshot every `interval` versions. `0` disables cadence writes. */
  readonly interval: number;
  /** Never write a snapshot below this aggregate version. */
  readonly minVersion: number;
  /** Rebuild the snapshot when a fallback (corrupt/incompatible) is detected. */
  readonly rebuildOnFallback: boolean;
}

/** A policy that never writes snapshots (pure replay). */
export const noSnapshotPolicy: SnapshotPolicy = {
  interval: 0,
  minVersion: 0,
  rebuildOnFallback: false,
};

/**
 * Decide whether the cadence rule requires writing a snapshot at `currentVersion`
 * given the version of the last snapshot.
 */
export function shouldWriteSnapshot(
  policy: SnapshotPolicy,
  currentVersion: number,
  lastSnapshotVersion: number,
): boolean {
  if (policy.interval <= 0) {
    return false;
  }
  if (currentVersion < policy.minVersion) {
    return false;
  }
  return currentVersion - lastSnapshotVersion >= policy.interval;
}
