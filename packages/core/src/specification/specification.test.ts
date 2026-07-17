import { describe, expect, it } from 'vitest';
import { Identifier } from '../identifier.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { isErr, isOk } from '../result.js';
import { specificationEventNames } from './events.js';
import type { RequirementId } from './requirement.js';
import {
  Specification,
  type SpecificationDependencies,
  type SpecificationId,
} from './specification.js';

class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}
  now(): Date {
    return this.instant;
  }
}

class SequentialIdGenerator implements IdGenerator {
  #counter = 0;
  next(): string {
    this.#counter += 1;
    return `evt_${this.#counter}`;
  }
}

function makeDeps(): SpecificationDependencies {
  return {
    clock: new FixedClock(new Date('2026-07-17T00:00:00.000Z')),
    ids: new SequentialIdGenerator(),
  };
}

function specId(value = 'HELIX-DOM-003'): SpecificationId {
  const id = Identifier.create('spec', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

function reqId(value: string): RequirementId {
  const id = Identifier.create('req', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

function draftWithRequirement(deps: SpecificationDependencies): Specification {
  const created = Specification.create(specId(), 'Auth spec', deps);
  if (!isOk(created)) {
    throw new Error('setup failed');
  }
  const spec = created.value;
  const added = spec.addRequirement(reqId('HELIX-SPEC-001'), 'MUST authenticate', deps);
  if (!isOk(added)) {
    throw new Error('setup failed');
  }
  return spec;
}

describe('Specification creation', () => {
  it('creates a draft and records a drafted event', () => {
    const deps = makeDeps();
    const result = Specification.create(specId(), 'Auth spec', deps);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const spec = result.value;
      expect(spec.status).toBe('draft');
      expect(spec.title).toBe('Auth spec');
      expect(spec.version).toBe(1);
      expect(spec.domainEvents.map((event) => event.name)).toEqual([
        specificationEventNames.drafted,
      ]);
    }
  });

  it('rejects an empty title', () => {
    expect(isErr(Specification.create(specId(), '  ', makeDeps()))).toBe(true);
  });
});

describe('Specification requirements collection', () => {
  it('adds requirements while in draft and bumps the version', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    expect(spec.requirements).toHaveLength(1);
    expect(spec.version).toBe(2);
  });

  it('rejects a duplicate requirement id', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    const duplicate = spec.addRequirement(reqId('HELIX-SPEC-001'), 'again', deps);
    expect(isErr(duplicate)).toBe(true);
  });

  it('rejects requirements once out of draft', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    expect(isOk(spec.submitForReview(deps))).toBe(true);
    const late = spec.addRequirement(reqId('HELIX-SPEC-002'), 'late', deps);
    expect(isErr(late)).toBe(true);
  });

  it('transitions an owned requirement and emits an event', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    const result = spec.transitionRequirement(reqId('HELIX-SPEC-001'), 'approved', deps);
    expect(isOk(result)).toBe(true);
    expect(spec.requirements[0]?.status).toBe('approved');
    expect(spec.domainEvents.map((event) => event.name)).toContain(
      specificationEventNames.requirementStatusChanged,
    );
  });

  it('rejects transitioning an unknown requirement', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    expect(isErr(spec.transitionRequirement(reqId('nope'), 'approved', deps))).toBe(true);
  });
});

describe('Specification review and lifecycle', () => {
  it('cannot submit a specification without requirements', () => {
    const deps = makeDeps();
    const created = Specification.create(specId(), 'Empty', deps);
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    expect(isErr(created.value.submitForReview(deps))).toBe(true);
  });

  it('follows the full forward lifecycle emitting events in order', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    expect(isOk(spec.submitForReview(deps))).toBe(true);
    expect(spec.status).toBe('review');
    expect(isOk(spec.approve(deps))).toBe(true);
    expect(spec.status).toBe('approved');
    expect(isOk(spec.markImplemented(deps))).toBe(true);
    expect(spec.status).toBe('implemented');
    expect(isOk(spec.supersede(specId('HELIX-DOM-004'), deps))).toBe(true);
    expect(spec.status).toBe('superseded');
    expect(isOk(spec.archive(deps))).toBe(true);
    expect(spec.status).toBe('archived');

    expect(spec.domainEvents.map((event) => event.name)).toEqual([
      specificationEventNames.drafted,
      specificationEventNames.requirementAdded,
      specificationEventNames.submittedForReview,
      specificationEventNames.approved,
      specificationEventNames.implemented,
      specificationEventNames.superseded,
      specificationEventNames.archived,
    ]);
  });

  it('rejects an illegal lifecycle transition', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    const result = spec.approve(deps);
    expect(isErr(result)).toBe(true);
    expect(spec.status).toBe('draft');
  });
});

describe('Specification snapshot and rehydration', () => {
  it('round-trips through a snapshot without emitting events', () => {
    const deps = makeDeps();
    const spec = draftWithRequirement(deps);
    expect(isOk(spec.submitForReview(deps))).toBe(true);
    const snapshot = spec.toSnapshot();

    const rehydrated = Specification.fromSnapshot(snapshot);
    expect(isOk(rehydrated)).toBe(true);
    if (isOk(rehydrated)) {
      expect(rehydrated.value.toSnapshot()).toEqual(snapshot);
      expect(rehydrated.value.domainEvents).toHaveLength(0);
      expect(rehydrated.value.status).toBe('review');
      expect(rehydrated.value.version).toBe(snapshot.version);
    }
  });
});

describe('Specification determinism', () => {
  it('produces identical events for identical inputs', () => {
    const first = draftWithRequirement(makeDeps());
    const second = draftWithRequirement(makeDeps());
    expect(first.domainEvents).toEqual(second.domainEvents);
  });
});
