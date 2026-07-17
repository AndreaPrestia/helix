import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { applyDelta, archiveChange } from './apply.js';
import type { BaselineSpec, ChangeStructure, DeltaSpec } from './model.js';
import { validateChangeStructure } from './validate.js';

const baseline: BaselineSpec = {
  capability: 'foundation/demo',
  title: 'Demo',
  requirements: [
    { name: 'A', text: 'MUST A' },
    { name: 'B', text: 'MUST B' },
  ],
};

function delta(requirements: DeltaSpec['requirements']): DeltaSpec {
  return { capability: 'foundation/demo', requirements };
}

function change(overrides: Partial<ChangeStructure> = {}): ChangeStructure {
  return {
    id: '0001-demo',
    manifest: { id: '0001-demo', status: 'proposed', dependsOn: [] },
    hasProposal: true,
    hasTasks: true,
    deltas: [delta([{ operation: 'added', name: 'C', text: 'MUST C' }])],
    ...overrides,
  };
}

describe('validateChangeStructure', () => {
  it('accepts a well-formed change', () => {
    expect(isOk(validateChangeStructure(change()))).toBe(true);
  });

  it('collects every structural issue', () => {
    const result = validateChangeStructure(
      change({
        manifest: { id: 'mismatch', status: 'proposed', dependsOn: [] },
        hasProposal: false,
        deltas: [],
      }),
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('applyDelta', () => {
  it('adds a new requirement', () => {
    const result = applyDelta(baseline, delta([{ operation: 'added', name: 'C', text: 'MUST C' }]));
    if (isOk(result)) {
      expect(result.value.requirements.map((r) => r.name)).toEqual(['A', 'B', 'C']);
    }
    // input unchanged
    expect(baseline.requirements).toHaveLength(2);
  });

  it('rejects adding an existing requirement', () => {
    expect(isErr(applyDelta(baseline, delta([{ operation: 'added', name: 'A', text: 'x' }])))).toBe(
      true,
    );
  });

  it('modifies an existing requirement', () => {
    const result = applyDelta(
      baseline,
      delta([{ operation: 'modified', name: 'A', text: 'MUST A v2' }]),
    );
    if (isOk(result)) {
      expect(result.value.requirements[0]?.text).toBe('MUST A v2');
    }
  });

  it('rejects modifying a missing requirement', () => {
    expect(
      isErr(applyDelta(baseline, delta([{ operation: 'modified', name: 'Z', text: 'x' }]))),
    ).toBe(true);
  });

  it('removes an existing requirement', () => {
    const result = applyDelta(baseline, delta([{ operation: 'removed', name: 'B', text: '' }]));
    if (isOk(result)) {
      expect(result.value.requirements.map((r) => r.name)).toEqual(['A']);
    }
  });

  it('rejects removing a missing requirement', () => {
    expect(
      isErr(applyDelta(baseline, delta([{ operation: 'removed', name: 'Z', text: '' }]))),
    ).toBe(true);
  });
});

describe('archiveChange', () => {
  it('merges deltas into baselines and reports the archived id', () => {
    const result = archiveChange(change(), [baseline]);
    if (isOk(result)) {
      const demo = result.value.updatedSpecs.find((s) => s.capability === 'foundation/demo');
      expect(demo?.requirements.map((r) => r.name)).toEqual(['A', 'B', 'C']);
      expect(result.value.archivedChangeId).toBe('0001-demo');
    }
  });

  it('creates a new baseline spec for a new capability', () => {
    const newCapabilityChange = change({
      deltas: [
        {
          capability: 'foundation/fresh',
          requirements: [{ operation: 'added', name: 'X', text: 'MUST X' }],
        },
      ],
    });
    const result = archiveChange(newCapabilityChange, [baseline]);
    if (isOk(result)) {
      const fresh = result.value.updatedSpecs.find((s) => s.capability === 'foundation/fresh');
      expect(fresh?.requirements.map((r) => r.name)).toEqual(['X']);
    }
  });

  it('refuses to archive an invalid change', () => {
    expect(isErr(archiveChange(change({ hasTasks: false, deltas: [] }), [baseline]))).toBe(true);
  });
});
