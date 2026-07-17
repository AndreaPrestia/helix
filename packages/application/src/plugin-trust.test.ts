import { describe, expect, it } from 'vitest';
import { PluginTrustEvaluator, type TrustPolicy } from './plugin-trust.js';

const policy: TrustPolicy = {
  minimumTrust: 'community',
  permissionsByLevel: {
    untrusted: [],
    community: ['read:workspace'],
    verified: ['write:workspace'],
    first_party: ['admin'],
  },
};

function evaluator(): PluginTrustEvaluator {
  return new PluginTrustEvaluator(policy);
}

describe('PluginTrustEvaluator', () => {
  it('grants permissions allowed at the plugin trust level (with inheritance)', () => {
    const result = evaluator().evaluate({
      id: 'p-1',
      trust: 'verified',
      requestedPermissions: ['read:workspace', 'write:workspace'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.grantedPermissions).toEqual(['read:workspace', 'write:workspace']);
    }
  });

  it('denies a plugin below the minimum trust', () => {
    const result = evaluator().evaluate({
      id: 'p-2',
      trust: 'untrusted',
      requestedPermissions: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TRUST_DENIED');
    }
  });

  it('denies permissions not allowed at the trust level (deny-by-default)', () => {
    const result = evaluator().evaluate({
      id: 'p-3',
      trust: 'community',
      requestedPermissions: ['read:workspace', 'admin'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reasons.some((r) => r.includes('admin'))).toBe(true);
    }
  });

  it('grants an empty permission set for a sufficiently trusted plugin', () => {
    const result = evaluator().evaluate({
      id: 'p-4',
      trust: 'community',
      requestedPermissions: [],
    });
    expect(result.ok && result.value.grantedPermissions).toEqual([]);
  });
});
