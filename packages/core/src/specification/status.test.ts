import { describe, expect, it } from 'vitest';
import {
  canTransition,
  requirementStatuses,
  requirementTransitions,
  specificationStatuses,
  specificationTransitions,
} from './status.js';

describe('specification status machine', () => {
  it('enumerates the frozen lifecycle states', () => {
    expect(specificationStatuses).toEqual([
      'draft',
      'review',
      'approved',
      'implemented',
      'superseded',
      'archived',
    ]);
  });

  it('permits only forward transitions', () => {
    expect(canTransition(specificationTransitions, 'draft', 'review')).toBe(true);
    expect(canTransition(specificationTransitions, 'review', 'approved')).toBe(true);
    expect(canTransition(specificationTransitions, 'draft', 'approved')).toBe(false);
    expect(canTransition(specificationTransitions, 'archived', 'draft')).toBe(false);
  });
});

describe('requirement status machine', () => {
  it('enumerates the frozen lifecycle states', () => {
    expect(requirementStatuses).toEqual([
      'proposed',
      'approved',
      'implemented',
      'verified',
      'deprecated',
    ]);
  });

  it('permits only forward transitions', () => {
    expect(canTransition(requirementTransitions, 'proposed', 'approved')).toBe(true);
    expect(canTransition(requirementTransitions, 'verified', 'deprecated')).toBe(true);
    expect(canTransition(requirementTransitions, 'proposed', 'verified')).toBe(false);
  });
});
