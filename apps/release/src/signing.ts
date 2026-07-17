import type { ArtifactManifest } from './artifact-manifest.js';

/** The result of (optionally) signing a release manifest. */
export interface SignedRelease {
  /** The manifest digest that was signed. */
  readonly digest: string;
  /** Whether a real signature was produced. */
  readonly signed: boolean;
  /** An identifier for the signer (e.g. key id), or `none`. */
  readonly signer: string;
  /** The detached signature over the manifest digest, empty when unsigned. */
  readonly signature: string;
}

/**
 * The signing extension point. Release signing is deliberately pluggable so the
 * platform stays vendor-neutral: a deployment supplies its own signer (KMS,
 * cosign, GPG, …). Implementations MUST be deterministic for a given manifest.
 */
export interface ReleaseSigner {
  sign(manifest: ArtifactManifest): SignedRelease;
}

/**
 * The default signer: produces an explicitly unsigned result. It never fakes a
 * signature — the release is clearly marked `signed: false` so downstream
 * policy can require a real signer when appropriate (Constitution Article 7).
 */
export class NullSigner implements ReleaseSigner {
  sign(manifest: ArtifactManifest): SignedRelease {
    return { digest: manifest.digest, signed: false, signer: 'none', signature: '' };
  }
}
