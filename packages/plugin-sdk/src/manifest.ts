import { type Result, err, ok } from '@helix/core';
import { parseVersion } from './api-compatibility.js';
import { PluginValidationError } from './errors.js';
import { isPermission, type Permission } from './permissions.js';

/** A versioned capability a plugin implements (ADR-0010). */
export interface CapabilityDeclaration {
  readonly name: string;
  readonly version: string;
}

/** A plugin manifest: identity, versions, capabilities, and declared permissions. */
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  /** The host API version the plugin targets. */
  readonly apiVersion: string;
  readonly capabilities: readonly CapabilityDeclaration[];
  readonly permissions: readonly Permission[];
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

/** Validate a plugin manifest, collecting all structural issues. */
export function validatePluginManifest(
  manifest: PluginManifest,
): Result<PluginManifest, PluginValidationError> {
  const issues: string[] = [];

  if (!ID_PATTERN.test(manifest.id)) {
    issues.push(`invalid plugin id: ${manifest.id}`);
  }
  if (manifest.name.trim() === '') {
    issues.push('plugin name must be non-empty');
  }
  if (parseVersion(manifest.version) === null) {
    issues.push(`invalid version: ${manifest.version}`);
  }
  if (parseVersion(manifest.apiVersion) === null) {
    issues.push(`invalid apiVersion: ${manifest.apiVersion}`);
  }

  const capabilityNames = new Set<string>();
  for (const capability of manifest.capabilities) {
    if (capability.name.trim() === '') {
      issues.push('capability name must be non-empty');
      continue;
    }
    if (capabilityNames.has(capability.name)) {
      issues.push(`duplicate capability: ${capability.name}`);
    }
    capabilityNames.add(capability.name);
    if (parseVersion(capability.version) === null) {
      issues.push(`capability ${capability.name} has invalid version: ${capability.version}`);
    }
  }

  for (const permission of manifest.permissions) {
    if (!isPermission(permission)) {
      issues.push(`unknown permission: ${permission}`);
    }
  }

  if (issues.length > 0) {
    return err(new PluginValidationError(issues));
  }
  return ok(manifest);
}
