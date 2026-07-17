import { describe, expect, it } from 'vitest';
import { QualityGate, allow, deny } from '@helix/governance';
import type { ArtifactManifest } from './artifact-manifest.js';
import { ReleaseEngine } from './release-engine.js';
import type { ReleaseChange } from './changelog.js';
import type { ReleaseSigner, SignedRelease } from './signing.js';

type Ctx = Record<string, never>;

function passingGate(): QualityGate<Ctx> {
  return new QualityGate<Ctx>('release', [{ id: 'p', evaluate: () => allow('p') }]);
}

function failingGate(): QualityGate<Ctx> {
  return new QualityGate<Ctx>('release', [{ id: 'p', evaluate: () => deny('p', ['not ready']) }]);
}

const current = { major: 1, minor: 2, patch: 0 };

const changes: readonly ReleaseChange[] = [
  { id: 'c-1', title: 'new thing', kind: 'feature', evidence: 'verification.md' },
];

const artifacts = [{ name: 'app.tgz', content: 'binary-bytes' }];

function baseInput() {
  return { current, changes, artifacts, gateContext: {} as Ctx };
}

describe('ReleaseEngine', () => {
  it('produces a gated, versioned, signed release plan', () => {
    const engine = new ReleaseEngine<Ctx>({ gate: passingGate() });
    const result = engine.release(baseInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe('1.3.0');
      expect(result.value.bump).toBe('minor');
      expect(result.value.changelog.features).toHaveLength(1);
      expect(result.value.manifest.artifacts[0]?.name).toBe('app.tgz');
      expect(result.value.signature.signed).toBe(false); // default NullSigner
    }
  });

  it('blocks the release when the quality gate fails', () => {
    const engine = new ReleaseEngine<Ctx>({ gate: failingGate() });
    const result = engine.release(baseInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RELEASE_BLOCKED');
    }
  });

  it('fails when there are no changes', () => {
    const engine = new ReleaseEngine<Ctx>({ gate: passingGate() });
    const result = engine.release({ ...baseInput(), changes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NO_CHANGES');
    }
  });

  it('propagates a changelog evidence error', () => {
    const engine = new ReleaseEngine<Ctx>({ gate: passingGate() });
    const result = engine.release({
      ...baseInput(),
      changes: [{ id: 'c-1', title: 'x', kind: 'fix', evidence: '' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CHANGELOG_EVIDENCE');
    }
  });

  it('propagates a manifest error', () => {
    const engine = new ReleaseEngine<Ctx>({ gate: passingGate() });
    const result = engine.release({
      ...baseInput(),
      artifacts: [
        { name: 'dup', content: 'a' },
        { name: 'dup', content: 'b' },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MANIFEST_INVALID');
    }
  });

  it('uses a pluggable signer extension point', () => {
    const signer: ReleaseSigner = {
      sign: (manifest: ArtifactManifest): SignedRelease => ({
        digest: manifest.digest,
        signed: true,
        signer: 'test-key',
        signature: `sig(${manifest.digest})`,
      }),
    };
    const engine = new ReleaseEngine<Ctx>({ gate: passingGate(), signer });
    const result = engine.release(baseInput());
    expect(result.ok && result.value.signature.signed).toBe(true);
    expect(result.ok && result.value.signature.signer).toBe('test-key');
  });
});
