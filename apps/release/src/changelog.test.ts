import { describe, expect, it } from 'vitest';
import { buildChangelog, type ReleaseChange } from './changelog.js';

const version = { major: 1, minor: 0, patch: 0 };

function change(overrides: Partial<ReleaseChange> = {}): ReleaseChange {
  return {
    id: overrides.id ?? 'c-1',
    title: overrides.title ?? 'a change',
    kind: overrides.kind ?? 'feature',
    evidence: overrides.evidence ?? 'verification.md',
  };
}

describe('buildChangelog', () => {
  it('groups changes by kind and sorts by id', () => {
    const result = buildChangelog(version, [
      change({ id: 'c-3', kind: 'fix' }),
      change({ id: 'c-1', kind: 'breaking' }),
      change({ id: 'c-2', kind: 'feature' }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe('1.0.0');
      expect(result.value.breaking.map((c) => c.id)).toEqual(['c-1']);
      expect(result.value.features.map((c) => c.id)).toEqual(['c-2']);
      expect(result.value.fixes.map((c) => c.id)).toEqual(['c-3']);
    }
  });

  it('rejects a change without evidence', () => {
    const result = buildChangelog(version, [change({ evidence: '  ' })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CHANGELOG_EVIDENCE');
      expect(result.error.issues[0]).toContain('no evidence');
    }
  });

  it('rejects a change without a title', () => {
    const result = buildChangelog(version, [change({ title: '' })]);
    expect(result.ok).toBe(false);
  });
});
