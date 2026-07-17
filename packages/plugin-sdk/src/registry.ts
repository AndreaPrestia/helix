import { type Option, type Result, err, fromNullable, ok } from '@helix/core';
import { isApiCompatible, SDK_API_VERSION } from './api-compatibility.js';
import {
  ApiIncompatibleError,
  PermissionDeniedError,
  type PluginError,
  PluginLifecycleError,
  PluginValidationError,
  UnknownPluginError,
} from './errors.js';
import { type Plugin, type PluginLifecycleState, canTransition } from './lifecycle.js';
import { validatePluginManifest } from './manifest.js';
import { deniedPermissions, type Permission } from './permissions.js';

/** A read-only view of a registered plugin. */
export interface RegisteredPlugin {
  readonly id: string;
  readonly state: PluginLifecycleState;
  readonly grantedPermissions: readonly Permission[];
}

interface Entry {
  readonly plugin: Plugin;
  state: PluginLifecycleState;
  readonly grantedPermissions: readonly Permission[];
}

/**
 * Registers plugins and manages their lifecycle. Registration validates the
 * manifest, checks host API compatibility, and enforces deny-by-default
 * permissions (Constitution Article 8). Lifecycle transitions are validated;
 * a failing lifecycle hook moves the plugin to `failed`.
 */
export class PluginRegistry {
  readonly #hostApiVersion: string;
  readonly #entries = new Map<string, Entry>();

  constructor(hostApiVersion: string = SDK_API_VERSION) {
    this.#hostApiVersion = hostApiVersion;
  }

  register(
    plugin: Plugin,
    grantedPermissions: readonly Permission[] = [],
  ): Result<RegisteredPlugin, PluginError> {
    const validated = validatePluginManifest(plugin.manifest);
    if (!validated.ok) {
      return validated;
    }
    if (this.#entries.has(plugin.manifest.id)) {
      return err(new PluginValidationError([`plugin already registered: ${plugin.manifest.id}`]));
    }
    if (!isApiCompatible(plugin.manifest.apiVersion, this.#hostApiVersion)) {
      return err(new ApiIncompatibleError(plugin.manifest.apiVersion, this.#hostApiVersion));
    }
    const denied = deniedPermissions(plugin.manifest.permissions, grantedPermissions);
    if (denied.length > 0) {
      return err(new PermissionDeniedError(denied));
    }

    const entry: Entry = {
      plugin,
      state: 'registered',
      grantedPermissions: [...grantedPermissions],
    };
    this.#entries.set(plugin.manifest.id, entry);
    return ok(view(plugin.manifest.id, entry));
  }

  activate(id: string): Result<RegisteredPlugin, PluginError> {
    return this.#transition(id, 'active', (plugin) => plugin.onActivate?.());
  }

  deactivate(id: string): Result<RegisteredPlugin, PluginError> {
    return this.#transition(id, 'inactive', (plugin) => plugin.onDeactivate?.());
  }

  get(id: string): Option<RegisteredPlugin> {
    const entry = this.#entries.get(id);
    return fromNullable(entry === undefined ? undefined : view(id, entry));
  }

  list(): readonly RegisteredPlugin[] {
    return [...this.#entries.entries()]
      .map(([id, entry]) => view(id, entry))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  #transition(
    id: string,
    to: PluginLifecycleState,
    hook: (plugin: Plugin) => Result<void, PluginError> | undefined,
  ): Result<RegisteredPlugin, PluginError> {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      return err(new UnknownPluginError(id));
    }
    if (!canTransition(entry.state, to)) {
      return err(
        new PluginLifecycleError(`cannot transition plugin ${id} from ${entry.state} to ${to}`),
      );
    }
    const hookResult = hook(entry.plugin);
    if (hookResult !== undefined && !hookResult.ok) {
      entry.state = 'failed';
      return hookResult;
    }
    entry.state = to;
    return ok(view(id, entry));
  }
}

function view(id: string, entry: Entry): RegisteredPlugin {
  return { id, state: entry.state, grantedPermissions: entry.grantedPermissions };
}
