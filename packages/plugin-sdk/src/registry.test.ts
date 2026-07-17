import { type Result, err, isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { PluginLifecycleError, type PluginError } from './errors.js';
import type { Plugin } from './lifecycle.js';
import type { PluginManifest } from './manifest.js';
import type { Permission } from './permissions.js';
import { PluginRegistry } from './registry.js';

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'github-scm',
    name: 'GitHub SCM',
    version: '1.0.0',
    apiVersion: '1.0.0',
    capabilities: [{ name: 'scm.pull-request', version: '1.0.0' }],
    permissions: ['network'],
    ...overrides,
  };
}

function plugin(overrides: Partial<PluginManifest> = {}, hooks: Partial<Plugin> = {}): Plugin {
  return { manifest: manifest(overrides), ...hooks };
}

const granted: readonly Permission[] = ['network'];

describe('PluginRegistry registration', () => {
  it('registers a valid, compatible, permitted plugin', () => {
    const registry = new PluginRegistry();
    const result = registry.register(plugin(), granted);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.state).toBe('registered');
      expect(result.value.grantedPermissions).toEqual(['network']);
    }
  });

  it('rejects a duplicate registration', () => {
    const registry = new PluginRegistry();
    registry.register(plugin(), granted);
    expect(isErr(registry.register(plugin(), granted))).toBe(true);
  });

  it('rejects an API-incompatible plugin', () => {
    const registry = new PluginRegistry('1.0.0');
    const result = registry.register(plugin({ apiVersion: '2.0.0' }), granted);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PLUGIN_API_INCOMPATIBLE');
    }
  });

  it('denies a plugin whose permissions are not granted', () => {
    const registry = new PluginRegistry();
    const result = registry.register(plugin({ permissions: ['network', 'secrets:read'] }), granted);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PLUGIN_PERMISSION_DENIED');
    }
  });
});

describe('PluginRegistry lifecycle', () => {
  it('activates and deactivates a plugin', () => {
    const registry = new PluginRegistry();
    registry.register(plugin(), granted);
    const activated = registry.activate('github-scm');
    expect(isOk(activated)).toBe(true);
    if (isOk(activated)) {
      expect(activated.value.state).toBe('active');
    }
    const deactivated = registry.deactivate('github-scm');
    if (isOk(deactivated)) {
      expect(deactivated.value.state).toBe('inactive');
    }
  });

  it('rejects an illegal transition', () => {
    const registry = new PluginRegistry();
    registry.register(plugin(), granted);
    const result = registry.deactivate('github-scm'); // registered -> inactive not allowed
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PLUGIN_LIFECYCLE_ERROR');
    }
  });

  it('moves the plugin to failed when an activate hook fails', () => {
    const registry = new PluginRegistry();
    const onActivate = (): Result<void, PluginError> => err(new PluginLifecycleError('boom'));
    registry.register(plugin({}, {}), granted);
    // Re-register with a hook via a fresh registry to attach the hook.
    const registry2 = new PluginRegistry();
    registry2.register({ manifest: manifest(), onActivate }, granted);
    const result = registry2.activate('github-scm');
    expect(isErr(result)).toBe(true);
    const state = registry2.get('github-scm');
    if (state.some) {
      expect(state.value.state).toBe('failed');
    }
  });

  it('reports an unknown plugin', () => {
    const registry = new PluginRegistry();
    const result = registry.activate('ghost');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PLUGIN_UNKNOWN');
    }
  });

  it('lists registered plugins sorted by id', () => {
    const registry = new PluginRegistry();
    registry.register(plugin({ id: 'zeta' }), granted);
    registry.register(plugin({ id: 'alpha' }), granted);
    expect(registry.list().map((p) => p.id)).toEqual(['alpha', 'zeta']);
  });
});
