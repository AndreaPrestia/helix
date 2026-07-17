import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, map, mapErr, ok, unwrapOr } from './result.js';

describe('Result', () => {
  it('constructs and narrows a success', () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('constructs and narrows a failure', () => {
    const result = err('boom');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('boom');
    }
  });

  it('maps the success value only', () => {
    expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    expect(map(err<string>('x'), (n: number) => n * 3)).toEqual(err('x'));
  });

  it('maps the error value only', () => {
    expect(mapErr(err('x'), (e) => `${e}!`)).toEqual(err('x!'));
    expect(mapErr(ok<number>(1), (e: string) => `${e}!`)).toEqual(ok(1));
  });

  it('unwraps with a fallback', () => {
    expect(unwrapOr(ok(1), 9)).toBe(1);
    expect(unwrapOr(err<string>('x') as never, 9)).toBe(9);
  });
});
