import { describe, expect, it } from 'vitest';
import { buildManifest } from './artifact-manifest.js';

describe('buildManifest', () => {
  it('builds a deterministic, name-sorted manifest with digests', () => {
    const first = buildManifest([
      { name: 'b.txt', content: 'beta' },
      { name: 'a.txt', content: 'alpha' },
    ]);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.artifacts.map((a) => a.name)).toEqual(['a.txt', 'b.txt']);
      expect(first.value.artifacts[0]?.bytes).toBe(5);
      expect(first.value.artifacts[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    }

    // Same artifacts (any order) → same manifest digest.
    const second = buildManifest([
      { name: 'a.txt', content: 'alpha' },
      { name: 'b.txt', content: 'beta' },
    ]);
    expect(second.ok && first.ok && second.value.digest).toBe(first.ok ? first.value.digest : '');
  });

  it('changes the digest when content changes', () => {
    const a = buildManifest([{ name: 'x', content: 'one' }]);
    const b = buildManifest([{ name: 'x', content: 'two' }]);
    expect(a.ok && b.ok && a.value.digest !== b.value.digest).toBe(true);
  });

  it('rejects an empty artifact name', () => {
    const result = buildManifest([{ name: '  ', content: 'x' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
    }
  });

  it('rejects duplicate artifact names', () => {
    const result = buildManifest([
      { name: 'dup', content: 'a' },
      { name: 'dup', content: 'b' },
    ]);
    expect(result.ok).toBe(false);
  });
});
