/**
 * Port generating unique identifiers. Injecting a generator keeps identifier
 * creation deterministic and testable (Constitution Article 3).
 */
export interface IdGenerator {
  /** Produce the next unique identifier string. */
  next(): string;
}
