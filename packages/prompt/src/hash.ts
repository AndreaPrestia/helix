import { createHash } from 'node:crypto';

/** Compute a stable SHA-256 hex digest of the input — the prompt's content id. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
