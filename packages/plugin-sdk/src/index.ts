/**
 * `@helix/plugin-sdk` — the plugin SDK.
 *
 * Defines the plugin manifest, versioned capability declarations, host API
 * compatibility, the plugin lifecycle, and deny-by-default sandbox/permission
 * declarations (ADR-0009, ADR-0010; Constitution Article 8). Plugins depend on
 * this SDK and public capability contracts, never on application internals.
 * Depends only on `@helix/core`.
 */

export {
  SDK_API_VERSION,
  parseVersion,
  isApiCompatible,
  type SemVer,
} from './api-compatibility.js';
export {
  knownPermissions,
  isPermission,
  deniedPermissions,
  type Permission,
} from './permissions.js';
export {
  validatePluginManifest,
  type PluginManifest,
  type CapabilityDeclaration,
} from './manifest.js';
export {
  pluginLifecycleStates,
  pluginLifecycleTransitions,
  canTransition,
  type PluginLifecycleState,
  type Plugin,
} from './lifecycle.js';
export { PluginRegistry, type RegisteredPlugin } from './registry.js';
export {
  PluginError,
  PluginValidationError,
  ApiIncompatibleError,
  PermissionDeniedError,
  PluginLifecycleError,
  UnknownPluginError,
} from './errors.js';
