import { describe, expect, it } from 'vitest';
import { ThreatModel, type Threat } from './threat-model.js';

function threat(overrides: Partial<Threat> = {}): Threat {
  return {
    id: overrides.id ?? 't-1',
    category: overrides.category ?? 'tampering',
    description: overrides.description ?? 'unauthorized state change',
    mitigation: overrides.mitigation ?? 'signed writes',
    status: overrides.status ?? 'planned',
  };
}

describe('ThreatModel', () => {
  it('registers and lists threats id-sorted', () => {
    const model = new ThreatModel();
    expect(model.register(threat({ id: 't-2' })).ok).toBe(true);
    expect(model.register(threat({ id: 't-1' })).ok).toBe(true);
    expect(model.list().map((t) => t.id)).toEqual(['t-1', 't-2']);
  });

  it('rejects a duplicate id', () => {
    const model = new ThreatModel();
    model.register(threat());
    const result = model.register(threat());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('THREAT_VALIDATION');
    }
  });

  it('rejects invalid fields', () => {
    const model = new ThreatModel();
    expect(model.register(threat({ id: '' })).ok).toBe(false);
    expect(model.register(threat({ description: '  ' })).ok).toBe(false);
    // @ts-expect-error deliberately invalid category
    expect(model.register(threat({ category: 'bogus' })).ok).toBe(false);
  });

  it('filters by category and unmitigated status', () => {
    const model = new ThreatModel();
    model.register(threat({ id: 't-1', category: 'spoofing', status: 'implemented' }));
    model.register(threat({ id: 't-2', category: 'spoofing', status: 'planned' }));
    expect(model.byCategory('spoofing').map((t) => t.id)).toEqual(['t-1', 't-2']);
    expect(model.unmitigated().map((t) => t.id)).toEqual(['t-2']);
  });

  it('computes coverage (implemented or accepted counts as covered)', () => {
    const model = new ThreatModel();
    expect(model.coverageRatio()).toBe(1); // empty
    model.register(threat({ id: 't-1', status: 'implemented' }));
    model.register(threat({ id: 't-2', status: 'accepted_risk' }));
    model.register(threat({ id: 't-3', status: 'planned' }));
    expect(model.coverageRatio()).toBeCloseTo(2 / 3);
  });
});
