import { type Result, err, ok } from '@helix/core';
import { ChangelogEvidenceError } from './errors.js';
import { formatVersion, type ChangeKind, type SemVer } from './version.js';

/** A change entering a release. Every change must cite verification evidence. */
export interface ReleaseChange {
  readonly id: string;
  readonly title: string;
  readonly kind: ChangeKind;
  /** A reference to the change's acceptance evidence (e.g. its verification report). */
  readonly evidence: string;
}

/** A rendered changelog grouped by change kind. */
export interface Changelog {
  readonly version: string;
  readonly breaking: readonly ReleaseChange[];
  readonly features: readonly ReleaseChange[];
  readonly fixes: readonly ReleaseChange[];
}

function sortById(changes: readonly ReleaseChange[]): readonly ReleaseChange[] {
  return [...changes].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Build a changelog for a version. Every change must carry a non-empty title
 * and evidence reference; a change without evidence blocks the changelog rather
 * than being silently dropped (Constitution Articles 6 and 7). Entries are
 * grouped by kind and id-sorted for deterministic output.
 */
export function buildChangelog(
  version: SemVer,
  changes: readonly ReleaseChange[],
): Result<Changelog, ChangelogEvidenceError> {
  const issues: string[] = [];
  for (const change of changes) {
    if (change.id.trim() === '') {
      issues.push('a change has an empty id');
      continue;
    }
    if (change.title.trim() === '') {
      issues.push(`change "${change.id}" has an empty title`);
    }
    if (change.evidence.trim() === '') {
      issues.push(`change "${change.id}" has no evidence`);
    }
  }
  if (issues.length > 0) {
    return err(new ChangelogEvidenceError(issues));
  }

  return ok({
    version: formatVersion(version),
    breaking: sortById(changes.filter((c) => c.kind === 'breaking')),
    features: sortById(changes.filter((c) => c.kind === 'feature')),
    fixes: sortById(changes.filter((c) => c.kind === 'fix')),
  });
}
