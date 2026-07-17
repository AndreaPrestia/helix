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
