/** Base class for all release errors. Every error carries a stable `code`. */
export abstract class ReleaseError extends Error {
  abstract readonly code: string;
}

/** Raised when a version string is malformed. */
export class VersionError extends ReleaseError {
  readonly code = 'VERSION_INVALID';
  constructor(readonly value: string) {
    super(`invalid semantic version "${value}"`);
  }
}

/** Raised when a release has no changes to release. */
export class NoChangesError extends ReleaseError {
  readonly code = 'NO_CHANGES';
  constructor() {
    super('no changes to release');
  }
}

/** Raised when a changelog entry lacks mandatory evidence or fields. */
export class ChangelogEvidenceError extends ReleaseError {
  readonly code = 'CHANGELOG_EVIDENCE';
  constructor(readonly issues: readonly string[]) {
    super(`changelog evidence missing: ${issues.join('; ')}`);
  }
}

/** Raised when the artifact manifest is invalid (empty/duplicate names). */
export class ManifestError extends ReleaseError {
  readonly code = 'MANIFEST_INVALID';
  constructor(readonly issues: readonly string[]) {
    super(`invalid artifact manifest: ${issues.join('; ')}`);
  }
}

/** Raised when the release quality gate does not pass. */
export class ReleaseBlockedError extends ReleaseError {
  readonly code = 'RELEASE_BLOCKED';
  constructor(readonly deniedPolicies: readonly string[]) {
    super(`release blocked by quality gate: ${deniedPolicies.join(', ') || 'gate failed'}`);
  }
}
