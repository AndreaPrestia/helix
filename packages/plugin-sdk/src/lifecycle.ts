import type { Result } from '@helix/core';
import type { PluginError } from './errors.js';
import type { PluginManifest } from './manifest.js';

/** The lifecycle states of a registered plugin. */
export const pluginLifecycleStates = ['registered', 'active', 'inactive', 'failed'] as const;
export type PluginLifecycleState = (typeof pluginLifecycleStates)[number];

/** Allowed lifecycle transitions. */
export const pluginLifecycleTransitions: Readonly<
  Record<PluginLifecycleState, readonly PluginLifecycleState[]>
> = {
  registered: ['active', 'failed'],
  active: ['inactive', 'failed'],
  inactive: ['active', 'failed'],
  failed: [],
};

/** Whether a lifecycle transition is permitted. */
export function canTransition(from: PluginLifecycleState, to: PluginLifecycleState): boolean {
  return pluginLifecycleTransitions[from].includes(to);
}

/**
 * The runtime plugin contract. Lifecycle hooks are optional and synchronous; a
 * hook that returns a failed `Result` moves the plugin to the `failed` state.
 */
export interface Plugin {
  readonly manifest: PluginManifest;
  onActivate?(): Result<void, PluginError>;
  onDeactivate?(): Result<void, PluginError>;
}
