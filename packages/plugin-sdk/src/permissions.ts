/** The permissions a plugin may declare (sandbox surface). Deny-by-default. */
export const knownPermissions = [
  'filesystem:read',
  'filesystem:write',
  'network',
  'process:spawn',
  'secrets:read',
  'clock',
  'random',
] as const;

export type Permission = (typeof knownPermissions)[number];

/** Whether a value is a recognized {@link Permission}. */
export function isPermission(value: string): value is Permission {
  return (knownPermissions as readonly string[]).includes(value);
}

/**
 * Authorize a plugin's declared permissions against a granted set
 * (deny-by-default, Constitution Article 8). Returns the declared permissions
 * that were NOT granted; an empty array means fully authorized.
 */
export function deniedPermissions(
  declared: readonly Permission[],
  granted: readonly Permission[],
): readonly Permission[] {
  const grantedSet = new Set(granted);
  return declared.filter((permission) => !grantedSet.has(permission));
}
