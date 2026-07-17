import type { RequirementStatus, SpecificationStatus } from './status.js';

/** Names of the domain events emitted by the specification aggregate. */
export const specificationEventNames = {
  drafted: 'specification.drafted',
  requirementAdded: 'specification.requirement-added',
  requirementStatusChanged: 'specification.requirement-status-changed',
  submittedForReview: 'specification.submitted-for-review',
  approved: 'specification.approved',
  implemented: 'specification.implemented',
  superseded: 'specification.superseded',
  archived: 'specification.archived',
} as const;

export interface SpecificationDraftedPayload {
  readonly title: string;
}

export interface RequirementAddedPayload {
  readonly requirementId: string;
  readonly text: string;
}

export interface RequirementStatusChangedPayload {
  readonly requirementId: string;
  readonly from: RequirementStatus;
  readonly to: RequirementStatus;
}

export interface SpecificationStatusChangedPayload {
  readonly from: SpecificationStatus;
  readonly to: SpecificationStatus;
}

export interface SpecificationSupersededPayload extends SpecificationStatusChangedPayload {
  readonly supersededBy: string;
}
