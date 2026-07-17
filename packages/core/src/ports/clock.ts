/**
 * Port supplying the current time. Injecting a clock keeps time-dependent
 * behavior deterministic and testable (Constitution Article 3).
 */
export interface Clock {
  /** The current instant. */
  now(): Date;
}
