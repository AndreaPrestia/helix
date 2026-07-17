import { none, some } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { TokenAuthenticator, type Principal } from './auth.js';

const alice: Principal = { id: 'alice' };

function authenticator(): TokenAuthenticator {
  return new TokenAuthenticator(new Map([['secret-token', alice]]));
}

describe('TokenAuthenticator', () => {
  it('authenticates a valid token', () => {
    const result = authenticator().authenticate(some('secret-token'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(alice);
    }
  });

  it('rejects an unknown token', () => {
    const result = authenticator().authenticate(some('nope'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects an absent token', () => {
    expect(authenticator().authenticate(none()).ok).toBe(false);
  });

  it('rejects an empty token', () => {
    expect(authenticator().authenticate(some('')).ok).toBe(false);
  });
});
