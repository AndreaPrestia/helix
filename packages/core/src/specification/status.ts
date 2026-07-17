/** The specification lifecycle states (see `state-machines.md`). */
export const specificationStatuses = [
  'draft',
  'review',
  'approved',
  'implemented',
  'superseded',
  'archived',
] as const;

export type SpecificationStatus = (typeof specificationStatuses)[number];

/** The requirement lifecycle states (see `state-machines.md`). */
export const requirementStatuses = [
  'proposed',
  'approved',
  'implemented',
  'verified',
  'deprecated',
] as const;

export type RequirementStatus = (typeof requirementStatuses)[number];

/** Allowed forward transitions for a specification. */
export const specificationTransitions: Readonly<
  Record<SpecificationStatus, readonly SpecificationStatus[]>
> = {
  draft: ['review'],
  review: ['approved'],
  approved: ['implemented'],
  implemented: ['superseded'],
  superseded: ['archived'],
  archived: [],
};

/** Allowed forward transitions for a requirement. */
export const requirementTransitions: Readonly<
  Record<RequirementStatus, readonly RequirementStatus[]>
> = {
  proposed: ['approved'],
  approved: ['implemented'],
  implemented: ['verified'],
  verified: ['deprecated'],
  deprecated: [],
};

/** Whether `to` is a permitted next state from `from` in the given machine. */
export function canTransition<S extends string>(
  transitions: Readonly<Record<S, readonly S[]>>,
  from: S,
  to: S,
): boolean {
  return transitions[from].includes(to);
}
