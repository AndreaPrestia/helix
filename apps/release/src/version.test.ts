import { describe, expect, it } from 'vitest';
import {
  applyBump,
  bumpFromChanges,
  calculateNextVersion,
  formatVersion,
  parseVersion,
} from './version.js';

describe('parseVersion / formatVersion', () => {
  it('parses a valid version', () => {
    const result = parseVersion('1.2.3');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(formatVersion(result.value)).toBe('1.2.3');
    }
  });

  it('rejects a malformed version', () => {
    const result = parseVersion('1.2');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VERSION_INVALID');
    }
  });
});

describe('bumpFromChanges', () => {
  it('picks the highest-significance bump', () => {
    expect(bumpFromChanges(['fix', 'feature', 'breaking'])).toBe('major');
    expect(bumpFromChanges(['fix', 'feature'])).toBe('minor');
    expect(bumpFromChanges(['fix'])).toBe('patch');
    expect(bumpFromChanges([])).toBe('none');
  });
});

describe('applyBump / calculateNextVersion', () => {
  const base = { major: 1, minor: 4, patch: 2 };

  it('bumps major and resets minor/patch', () => {
    expect(applyBump(base, 'major')).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  it('bumps minor and resets patch', () => {
    expect(applyBump(base, 'minor')).toEqual({ major: 1, minor: 5, patch: 0 });
  });

  it('bumps patch', () => {
    expect(applyBump(base, 'patch')).toEqual({ major: 1, minor: 4, patch: 3 });
  });

  it('leaves the version unchanged for none', () => {
    expect(applyBump(base, 'none')).toEqual(base);
  });

  it('calculates the next version from change kinds', () => {
    expect(calculateNextVersion(base, ['feature', 'fix'])).toEqual({
      version: { major: 1, minor: 5, patch: 0 },
      bump: 'minor',
    });
  });
});
