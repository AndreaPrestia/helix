import type { RequirementSnapshot } from './requirement.js';
import type { SpecificationStatus } from './status.js';

/** Immutable snapshot of a {@link Specification} aggregate. */
export interface SpecificationSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: SpecificationStatus;
  readonly version: number;
  readonly requirements: readonly RequirementSnapshot[];
}
