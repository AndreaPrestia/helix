import { type Result, err, ok } from '@helix/core';
import type { QualityGate, Waiver } from '@helix/governance';
import { type ArtifactInput, type ArtifactManifest, buildManifest } from './artifact-manifest.js';
import { type Changelog, type ReleaseChange, buildChangelog } from './changelog.js';
import { NoChangesError, ReleaseBlockedError, type ReleaseError } from './errors.js';
import { NullSigner, type ReleaseSigner, type SignedRelease } from './signing.js';
import { type BumpLevel, type SemVer, calculateNextVersion, formatVersion } from './version.js';

/** Dependencies for the release engine. */
export interface ReleaseEngineDeps<GateContext> {
  readonly gate: QualityGate<GateContext>;
  /** The signer used for the release; defaults to {@link NullSigner}. */
  readonly signer?: ReleaseSigner;
}

/** The inputs to a release. */
export interface ReleaseInput<GateContext> {
  readonly current: SemVer;
  readonly changes: readonly ReleaseChange[];
  readonly artifacts: readonly ArtifactInput[];
  readonly gateContext: GateContext;
  readonly waivers?: readonly Waiver[];
}

/** A fully computed, gated release plan. */
export interface ReleasePlan {
  readonly version: string;
  readonly bump: BumpLevel;
  readonly changelog: Changelog;
  readonly manifest: ArtifactManifest;
  readonly signature: SignedRelease;
}

/**
 * Orchestrates a release deterministically. It enforces the quality gate first
 * (a failing gate blocks the release), calculates the next version from the
 * change kinds, builds an evidence-backed changelog and an artifact manifest,
 * and applies the pluggable signer. Every failure is explicit and typed; a
 * blocked or incomplete release never succeeds silently (Constitution Article 7).
 */
export class ReleaseEngine<GateContext> {
  readonly #gate: QualityGate<GateContext>;
  readonly #signer: ReleaseSigner;

  constructor(deps: ReleaseEngineDeps<GateContext>) {
    this.#gate = deps.gate;
    this.#signer = deps.signer ?? new NullSigner();
  }

  release(input: ReleaseInput<GateContext>): Result<ReleasePlan, ReleaseError> {
    const report = this.#gate.evaluate(input.gateContext, input.waivers ?? []);
    if (report.status !== 'passed') {
      return err(new ReleaseBlockedError(report.deniedPolicies));
    }

    if (input.changes.length === 0) {
      return err(new NoChangesError());
    }

    const { version, bump } = calculateNextVersion(
      input.current,
      input.changes.map((change) => change.kind),
    );

    const changelog = buildChangelog(version, input.changes);
    if (!changelog.ok) {
      return err(changelog.error);
    }

    const manifest = buildManifest(input.artifacts);
    if (!manifest.ok) {
      return err(manifest.error);
    }

    return ok({
      version: formatVersion(version),
      bump,
      changelog: changelog.value,
      manifest: manifest.value,
      signature: this.#signer.sign(manifest.value),
    });
  }
}
