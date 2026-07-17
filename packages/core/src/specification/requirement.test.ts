import { describe, expect, it } from 'vitest';
import { Identifier } from '../identifier.js';
import { isErr, isOk } from '../result.js';
import { Requirement, type RequirementId } from './requirement.js';

function reqId(value: string): RequirementId {
  const id = Identifier.create('req', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

describe('Requirement', () => {
  it('creates a proposed requirement', () => {
    const result = Requirement.create(reqId('HELIX-SPEC-001'), 'The system MUST log in.');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('proposed');
      expect(result.value.text).toBe('The system MUST log in.');
    }
  });

  it('rejects empty text', () => {
    expect(isErr(Requirement.create(reqId('r-1'), '   '))).toBe(true);
  });

  it('transitions forward through its lifecycle', () => {
    const created = Requirement.create(reqId('r-1'), 'text');
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const requirement = created.value;
    expect(isOk(requirement.changeStatus('approved'))).toBe(true);
    expect(requirement.status).toBe('approved');
    expect(isOk(requirement.changeStatus('implemented'))).toBe(true);
    expect(requirement.status).toBe('implemented');
  });

  it('rejects an illegal transition', () => {
    const created = Requirement.create(reqId('r-1'), 'text');
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const result = created.value.changeStatus('verified');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVARIANT_VIOLATION');
    }
    expect(created.value.status).toBe('proposed');
  });

  it('round-trips through a snapshot', () => {
    const created = Requirement.create(reqId('r-1'), 'text');
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const snapshot = created.value.toSnapshot();
    const rehydrated = Requirement.fromSnapshot(snapshot);
    if (!isOk(rehydrated)) {
      throw new Error('rehydration failed');
    }
    expect(rehydrated.value.toSnapshot()).toEqual(snapshot);
  });
});
