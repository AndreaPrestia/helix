/** Freshness metadata: when the artifact was last reviewed and how long it stays fresh. */
export interface Freshness {
  readonly reviewedAt: Date;
  readonly ttlDays: number;
}

const MS_PER_DAY = 86_400_000;

/** Whether the artifact is stale at `now` (its TTL has elapsed since review). */
export function isStale(freshness: Freshness, now: Date): boolean {
  const elapsedDays = (now.getTime() - freshness.reviewedAt.getTime()) / MS_PER_DAY;
  return elapsedDays > freshness.ttlDays;
}
