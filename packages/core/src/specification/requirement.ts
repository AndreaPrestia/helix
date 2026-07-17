import { InvariantViolation, ValidationError } from '../domain-error.js';
import { Entity } from '../entity.js';
import { Identifier } from '../identifier.js';
import { type Result, err, ok } from '../result.js';
import { type RequirementStatus, canTransition, requirementTransitions } from './status.js';

/** Typed identifier for a requirement. */
export type RequirementId = Identifier<'req'>;

/** Immutable snapshot of a {@link Requirement}. */
export interface RequirementSnapshot {
  readonly id: string;
  readonly text: string;
  readonly status: RequirementStatus;
}

/**
 * A requirement owned by a {@link Specification}. Its status transitions follow
 * the frozen requirement state machine and are driven exclusively through the
 * owning aggregate root.
 */
export class Requirement extends Entity<RequirementId> {
  #text: string;
  #status: RequirementStatus;

  private constructor(id: RequirementId, text: string, status: RequirementStatus) {
    super(id);
    this.#text = text;
    this.#status = status;
  }

  get text(): string {
    return this.#text;
  }

  get status(): RequirementStatus {
    return this.#status;
  }

  /** Create a new requirement in the `proposed` state. */
  static create(id: RequirementId, text: string): Result<Requirement, ValidationError> {
    if (text.trim().length === 0) {
      return err(new ValidationError('requirement text must be a non-empty string'));
    }
    return ok(new Requirement(id, text, 'proposed'));
  }

  /**
   * Transition the requirement to a new status. Intended to be called only by
   * the owning {@link Specification} aggregate.
   */
  changeStatus(to: RequirementStatus): Result<Requirement, InvariantViolation> {
    if (!canTransition(requirementTransitions, this.#status, to)) {
      return err(
        new InvariantViolation(`cannot transition requirement from ${this.#status} to ${to}`),
      );
    }
    this.#status = to;
    return ok(this);
  }

  toSnapshot(): RequirementSnapshot {
    return { id: this.id.value, text: this.#text, status: this.#status };
  }

  /** Rehydrate a requirement from a snapshot without validation side effects. */
  static fromSnapshot(snapshot: RequirementSnapshot): Result<Requirement, ValidationError> {
    const id = Identifier.create('req', snapshot.id);
    if (!id.ok) {
      return id;
    }
    return ok(new Requirement(id.value, snapshot.text, snapshot.status));
  }
}
