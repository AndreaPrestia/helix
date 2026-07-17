import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { isApiCompatible, parseVersion, SDK_API_VERSION } from './api-compatibility.js';
import { validatePluginManifest, type PluginManifest } from './manifest.js';
import { canTransition } from './lifecycle.js';
import { deniedPermissions, isPermission } from './permissions.js';

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'github-scm',
    name: 'GitHub SCM',
    version: '1.2.3',
    apiVersion: SDK_API_VERSION,
    capabilities: [{ name: 'scm.pull-request', version: '1.0.0' }],
    permissions: ['network'],
    ...overrides,
  };
}

describe('API compatibility', () => {
  it('parses semantic versions', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion('nope')).toBeNull();
  });

  it('is compatible within the same major when the host is new enough', () => {
    expect(isApiCompatible('1.0.0', '1.0.0')).toBe(true);
    expect(isApiCompatible('1.0.0', '1.4.0')).toBe(true);
    expect(isApiCompatible('1.5.0', '1.0.0')).toBe(false); // host too old
    expect(isApiCompatible('2.0.0', '1.0.0')).toBe(false); // major mismatch
    expect(isApiCompatible('bad', '1.0.0')).toBe(false);
  });
});

describe('permissions', () => {
  it('recognizes known permissions', () => {
    expect(isPermission('network')).toBe(true);
    expect(isPermission('mind-control')).toBe(false);
  });

  it('denies permissions that are not granted (deny by default)', () => {
    expect(deniedPermissions(['network', 'filesystem:read'], ['network'])).toEqual([
      'filesystem:read',
    ]);
    expect(deniedPermissions(['network'], ['network'])).toEqual([]);
    expect(deniedPermissions(['network'], [])).toEqual(['network']);
  });
});

describe('manifest validation', () => {
  it('accepts a well-formed manifest', () => {
    expect(isOk(validatePluginManifest(manifest()))).toBe(true);
  });

  it('collects structural issues', () => {
    const result = validatePluginManifest(
      manifest({
        id: 'bad id',
        version: 'x',
        capabilities: [{ name: 'c', version: 'y' }],
        permissions: ['unknown-perm' as 'network'],
      }),
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('lifecycle transitions', () => {
  it('permits only valid transitions', () => {
    expect(canTransition('registered', 'active')).toBe(true);
    expect(canTransition('active', 'inactive')).toBe(true);
    expect(canTransition('inactive', 'active')).toBe(true);
    expect(canTransition('registered', 'inactive')).toBe(false);
    expect(canTransition('failed', 'active')).toBe(false);
  });
});
