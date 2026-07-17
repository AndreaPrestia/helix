import { DomainError } from '@helix/core';

/** Base class for plugin-SDK failures. */
export abstract class PluginError extends DomainError {}

/** Raised when a plugin manifest is structurally invalid. Carries all issues. */
export class PluginValidationError extends PluginError {
  readonly code = 'PLUGIN_VALIDATION_ERROR';

  constructor(readonly issues: readonly string[]) {
    super(`invalid plugin: ${issues.join('; ')}`);
  }
}

/** Raised when a plugin targets an incompatible host API version. */
export class ApiIncompatibleError extends PluginError {
  readonly code = 'PLUGIN_API_INCOMPATIBLE';

  constructor(
    readonly pluginApiVersion: string,
    readonly hostApiVersion: string,
  ) {
    super(`plugin API version ${pluginApiVersion} is incompatible with host ${hostApiVersion}`);
  }
}

/** Raised when a plugin declares permissions that have not been granted. */
export class PermissionDeniedError extends PluginError {
  readonly code = 'PLUGIN_PERMISSION_DENIED';

  constructor(readonly denied: readonly string[]) {
    super(`permission(s) denied: ${denied.join(', ')}`);
  }
}

/** Raised on an illegal plugin lifecycle transition. */
export class PluginLifecycleError extends PluginError {
  readonly code = 'PLUGIN_LIFECYCLE_ERROR';
}

/** Raised when a plugin id is not registered. */
export class UnknownPluginError extends PluginError {
  readonly code = 'PLUGIN_UNKNOWN';

  constructor(readonly pluginId: string) {
    super(`unknown plugin: ${pluginId}`);
  }
}
