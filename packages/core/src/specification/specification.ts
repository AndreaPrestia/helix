import { AggregateRoot } from '../aggregate-root.js';
import { type DomainError, InvariantViolation, ValidationError } from '../domain-error.js';
import { Identifier } from '../identifier.js';
import { type Result, err, ok } from '../result.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { Requirement, type RequirementId } from './requirement.js';
import { type SpecificationSnapshot } from './snapshot.js';
import { specificationEventNames } from './events.js';
import {
  type RequirementStatus,
  type SpecificationStatus,
  canTransition,
  specificationTransitions,
} from './status.js';

/** Typed identifier for a specification. */
export type SpecificationId = Identifier<'spec'>;

/** Ports required to perform specification behaviors deterministically. */
export interface SpecificationDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/**
 * The Specification aggregate root. It owns its requirements, protects its
 * lifecycle invariants, expresses transitions as behavior, and records domain
 * events rather than exposing mutable state (ADR-0015).
 */
export class Specification extends AggregateRoot<SpecificationId> {
  #title: string;
  #status: SpecificationStatus;
  readonly #requirements: Map<string, Requirement>;
  #version: number;

  private constructor(
    id: SpecificationId,
    title: string,
    status: SpecificationStatus,
    requirements: Map<string, Requirement>,
    version: number,
  ) {
    super(id);
    this.#title = title;
    this.#status = status;
    this.#requirements = requirements;
    this.#version = version;
  }

  get title(): string {
    return this.#title;
  }

  get status(): SpecificationStatus {
    return this.#status;
  }

  get version(): number {
    return this.#version;
  }

  /** An immutable view of the owned requirements. */
  get requirements(): readonly Requirement[] {
    return [...this.#requirements.values()];
  }

  /** Create a new specification in the `draft` state. */
  static create(
    id: SpecificationId,
    title: string,
    deps: SpecificationDependencies,
  ): Result<Specification, ValidationError> {
    if (title.trim().length === 0) {
      return err(new ValidationError('specification title must be a non-empty string'));
    }
    const specification = new Specification(id, title, 'draft', new Map(), 1);
    specification.#emit(specificationEventNames.drafted, { title }, deps);
    return ok(specification);
  }

  /** Add a requirement. Only permitted while the specification is a draft. */
  addRequirement(
    id: RequirementId,
    text: string,
    deps: SpecificationDependencies,
  ): Result<Requirement, DomainError> {
    if (this.#status !== 'draft') {
      return err(new InvariantViolation('requirements may only be added while in draft'));
    }
    if (this.#requirements.has(id.value)) {
      return err(new InvariantViolation(`requirement ${id.value} already exists`));
    }
    const requirement = Requirement.create(id, text);
    if (!requirement.ok) {
      return requirement;
    }
    this.#requirements.set(id.value, requirement.value);
    this.#version += 1;
    this.#emit(specificationEventNames.requirementAdded, { requirementId: id.value, text }, deps);
    return requirement;
  }

  /** Transition an owned requirement through its lifecycle. */
  transitionRequirement(
    id: RequirementId,
    to: RequirementStatus,
    deps: SpecificationDependencies,
  ): Result<Requirement, InvariantViolation> {
    const requirement = this.#requirements.get(id.value);
    if (requirement === undefined) {
      return err(new InvariantViolation(`unknown requirement ${id.value}`));
    }
    const from = requirement.status;
    const changed = requirement.changeStatus(to);
    if (!changed.ok) {
      return changed;
    }
    this.#version += 1;
    this.#emit(
      specificationEventNames.requirementStatusChanged,
      { requirementId: id.value, from, to },
      deps,
    );
    return changed;
  }

  /** Submit a draft for review. Requires at least one requirement. */
  submitForReview(deps: SpecificationDependencies): Result<Specification, InvariantViolation> {
    if (this.#requirements.size === 0) {
      return err(new InvariantViolation('cannot submit a specification with no requirements'));
    }
    return this.#transition('review', specificationEventNames.submittedForReview, deps);
  }

  /** Approve a specification under review. */
  approve(deps: SpecificationDependencies): Result<Specification, InvariantViolation> {
    return this.#transition('approved', specificationEventNames.approved, deps);
  }

  /** Mark an approved specification as implemented. */
  markImplemented(deps: SpecificationDependencies): Result<Specification, InvariantViolation> {
    return this.#transition('implemented', specificationEventNames.implemented, deps);
  }

  /** Supersede an implemented specification with another one. */
  supersede(
    supersededBy: SpecificationId,
    deps: SpecificationDependencies,
  ): Result<Specification, InvariantViolation> {
    const from = this.#status;
    if (!canTransition(specificationTransitions, from, 'superseded')) {
      return err(
        new InvariantViolation(`cannot transition specification from ${from} to superseded`),
      );
    }
    this.#status = 'superseded';
    this.#version += 1;
    this.#emit(
      specificationEventNames.superseded,
      { from, to: 'superseded', supersededBy: supersededBy.value },
      deps,
    );
    return ok(this);
  }

  /** Archive a superseded specification. */
  archive(deps: SpecificationDependencies): Result<Specification, InvariantViolation> {
    return this.#transition('archived', specificationEventNames.archived, deps);
  }

  #transition(
    to: SpecificationStatus,
    eventName: string,
    deps: SpecificationDependencies,
  ): Result<Specification, InvariantViolation> {
    const from = this.#status;
    if (!canTransition(specificationTransitions, from, to)) {
      return err(new InvariantViolation(`cannot transition specification from ${from} to ${to}`));
    }
    this.#status = to;
    this.#version += 1;
    this.#emit(eventName, { from, to }, deps);
    return ok(this);
  }

  #emit<Payload>(name: string, payload: Payload, deps: SpecificationDependencies): void {
    this.raise({
      eventId: deps.ids.next(),
      name,
      aggregateId: this.id.value,
      occurredAt: deps.clock.now(),
      payload,
    });
  }

  /** Produce an immutable snapshot of the aggregate's state. */
  toSnapshot(): SpecificationSnapshot {
    return {
      id: this.id.value,
      title: this.#title,
      status: this.#status,
      version: this.#version,
      requirements: this.requirements.map((requirement) => requirement.toSnapshot()),
    };
  }

  /** Rehydrate an aggregate from a snapshot. No domain events are emitted. */
  static fromSnapshot(snapshot: SpecificationSnapshot): Result<Specification, ValidationError> {
    const id = Identifier.create('spec', snapshot.id);
    if (!id.ok) {
      return id;
    }
    const requirements = new Map<string, Requirement>();
    for (const requirementSnapshot of snapshot.requirements) {
      const requirement = Requirement.fromSnapshot(requirementSnapshot);
      if (!requirement.ok) {
        return requirement;
      }
      requirements.set(requirementSnapshot.id, requirement.value);
    }
    return ok(
      new Specification(id.value, snapshot.title, snapshot.status, requirements, snapshot.version),
    );
  }
}
