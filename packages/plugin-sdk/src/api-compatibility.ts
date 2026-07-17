/** A parsed semantic version. */
export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** The API version this SDK exposes to plugins. */
export const SDK_API_VERSION = '1.0.0';

/** Parse a `major.minor.patch` string, or `null` when malformed. */
export function parseVersion(value: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (match === null) {
    return null;
  }
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

function compare(a: SemVer, b: SemVer): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Whether a plugin targeting `pluginApiVersion` is compatible with a host at
 * `hostApiVersion`. Compatible means the same major version and a host that is
 * at least the version the plugin targets (backward compatibility within a
 * major).
 */
export function isApiCompatible(pluginApiVersion: string, hostApiVersion: string): boolean {
  const plugin = parseVersion(pluginApiVersion);
  const host = parseVersion(hostApiVersion);
  if (plugin === null || host === null) {
    return false;
  }
  return plugin.major === host.major && compare(host, plugin) >= 0;
}
