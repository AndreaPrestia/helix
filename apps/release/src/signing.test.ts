import { describe, expect, it } from 'vitest';
import { buildManifest } from './artifact-manifest.js';
import { NullSigner } from './signing.js';

describe('NullSigner', () => {
  it('produces an explicitly unsigned result over the manifest digest', () => {
    const manifest = buildManifest([{ name: 'a', content: 'x' }]);
    expect(manifest.ok).toBe(true);
    if (manifest.ok) {
      const signed = new NullSigner().sign(manifest.value);
      expect(signed).toEqual({
        digest: manifest.value.digest,
        signed: false,
        signer: 'none',
        signature: '',
      });
    }
  });
});
