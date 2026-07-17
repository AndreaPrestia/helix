import { createHash } from 'node:crypto';
import { type Result, err, ok } from '@helix/core';
import { ManifestError } from './errors.js';

/** An artifact to include in a release, with its content. */
export interface ArtifactInput {
  readonly name: string;
  readonly content: string;
}

/** A manifest entry: an artifact with its size and content digest. */
export interface ArtifactEntry {
  readonly name: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** A deterministic manifest of release artifacts with an overall digest. */
export interface ArtifactManifest {
  readonly artifacts: readonly ArtifactEntry[];
  /** SHA-256 over the sorted `name:sha256` lines, identifying the manifest. */
  readonly digest: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Build a deterministic artifact manifest. Artifact names must be non-empty and
 * unique. Each entry records its byte length and SHA-256 digest; the manifest
 * digest is the SHA-256 of the sorted `name:sha256` lines, so the same set of
 * artifacts always yields the same manifest (Constitution Article 3).
 */
export function buildManifest(
  artifacts: readonly ArtifactInput[],
): Result<ArtifactManifest, ManifestError> {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (artifact.name.trim() === '') {
      issues.push('an artifact has an empty name');
      continue;
    }
    if (seen.has(artifact.name)) {
      issues.push(`duplicate artifact name "${artifact.name}"`);
    }
    seen.add(artifact.name);
  }
  if (issues.length > 0) {
    return err(new ManifestError(issues));
  }

  const entries: ArtifactEntry[] = artifacts
    .map((artifact) => ({
      name: artifact.name,
      bytes: Buffer.byteLength(artifact.content, 'utf8'),
      sha256: sha256(artifact.content),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const digest = sha256(entries.map((entry) => `${entry.name}:${entry.sha256}`).join('\n'));
  return ok({ artifacts: entries, digest });
}
