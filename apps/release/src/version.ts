import { type Result, err, ok } from '@helix/core';
import { VersionError } from './errors.js';

/** A parsed semantic version. */
export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** The kind of change contributing to a release, in increasing significance. */
export type ChangeKind = 'fix' | 'feature' | 'breaking';

/** A version bump level. */
export type BumpLevel = 'none' | 'patch' | 'minor' | 'major';

/** Parse a `major.minor.patch` version string. */
export function parseVersion(value: string): Result<SemVer, VersionError> {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (match === null) {
    return err(new VersionError(value));
  }
  const [, major, minor, patch] = match;
  return ok({ major: Number(major), minor: Number(minor), patch: Number(patch) });
}

/** Format a {@link SemVer} as `major.minor.patch`. */
export function formatVersion(version: SemVer): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/** Determine the required bump level from a set of change kinds (highest wins). */
export function bumpFromChanges(kinds: readonly ChangeKind[]): BumpLevel {
  if (kinds.includes('breaking')) {
    return 'major';
  }
  if (kinds.includes('feature')) {
    return 'minor';
  }
  if (kinds.includes('fix')) {
    return 'patch';
  }
  return 'none';
}

/** Apply a bump level to a version deterministically. */
export function applyBump(current: SemVer, bump: BumpLevel): SemVer {
  switch (bump) {
    case 'major':
      return { major: current.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case 'patch':
      return { major: current.major, minor: current.minor, patch: current.patch + 1 };
    case 'none':
      return current;
  }
}

/** Calculate the next version from the current version and a set of change kinds. */
export function calculateNextVersion(
  current: SemVer,
  kinds: readonly ChangeKind[],
): { readonly version: SemVer; readonly bump: BumpLevel } {
  const bump = bumpFromChanges(kinds);
  return { version: applyBump(current, bump), bump };
}
