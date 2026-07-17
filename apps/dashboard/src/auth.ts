import { type Option, type Result, err, ok } from '@helix/core';
import { UnauthenticatedError } from './errors.js';

/** An authenticated caller. */
export interface Principal {
  readonly id: string;
}

/** Authenticates dashboard callers against the daemon's issued tokens. */
export interface Authenticator {
  authenticate(token: Option<string>): Result<Principal, UnauthenticatedError>;
}

/** Constant-time string comparison to avoid leaking token contents via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * A token-based {@link Authenticator}. The daemon issues bearer tokens mapped to
 * principals; the dashboard authenticates each request against them. Tokens are
 * compared in constant time and never included in error messages.
 */
export class TokenAuthenticator implements Authenticator {
  readonly #tokens: readonly (readonly [string, Principal])[];

  constructor(tokens: ReadonlyMap<string, Principal>) {
    this.#tokens = [...tokens.entries()];
  }

  authenticate(token: Option<string>): Result<Principal, UnauthenticatedError> {
    if (!token.some || token.value === '') {
      return err(new UnauthenticatedError());
    }
    for (const [candidate, principal] of this.#tokens) {
      if (timingSafeEqual(candidate, token.value)) {
        return ok(principal);
      }
    }
    return err(new UnauthenticatedError());
  }
}
