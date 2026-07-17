/**
 * `@helix/core` — the dependency-free domain kernel.
 *
 * This package MUST NOT import Node built-ins, infrastructure, frameworks, or
 * AI providers (Constitution Article 5, ADR-0014). It exposes only pure domain
 * primitives and ports.
 */

export type { Result, Ok, Err } from './result.js';
export { ok, err, isOk, isErr, map, mapErr, unwrapOr } from './result.js';

export type { Option, Some, None } from './option.js';
export { some, none, fromNullable, isSome, isNone, mapOption, getOrElse } from './option.js';

export { DomainError, InvariantViolation, ValidationError } from './domain-error.js';

export { ValueObject } from './value-object.js';
export { Entity } from './entity.js';
export { AggregateRoot } from './aggregate-root.js';

export { Identifier } from './identifier.js';

export type { DomainEvent } from './domain-event.js';

export type { Clock } from './ports/clock.js';
export type { IdGenerator } from './ports/id-generator.js';

export {
  Specification,
  type SpecificationId,
  type SpecificationDependencies,
} from './specification/specification.js';
export {
  Requirement,
  type RequirementId,
  type RequirementSnapshot,
} from './specification/requirement.js';
export type { SpecificationSnapshot } from './specification/snapshot.js';
export {
  specificationStatuses,
  requirementStatuses,
  specificationTransitions,
  requirementTransitions,
  canTransition,
  type SpecificationStatus,
  type RequirementStatus,
} from './specification/status.js';
export {
  specificationEventNames,
  type SpecificationDraftedPayload,
  type RequirementAddedPayload,
  type RequirementStatusChangedPayload,
  type SpecificationStatusChangedPayload,
  type SpecificationSupersededPayload,
} from './specification/events.js';

export { Task, type TaskId, type TaskDependencies } from './task/task.js';
export type { TaskSnapshot } from './task/snapshot.js';
export { taskStatuses, taskTransitions, type TaskStatus } from './task/status.js';
export {
  taskEventNames,
  type TaskCreatedPayload,
  type TaskStatusChangedPayload,
  type TaskBlockedPayload,
  type TaskCancelledPayload,
} from './task/events.js';
