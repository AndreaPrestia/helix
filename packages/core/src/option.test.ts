import { describe, expect, it } from 'vitest';
import { fromNullable, getOrElse, isNone, isSome, mapOption, none, some } from './option.js';

describe('Option', () => {
  it('constructs and narrows a present value', () => {
    const option = some('x');
    expect(isSome(option)).toBe(true);
    expect(isNone(option)).toBe(false);
    if (isSome(option)) {
      expect(option.value).toBe('x');
    }
  });

  it('constructs an absent value', () => {
    expect(isNone(none())).toBe(true);
  });

  it('builds from nullish values', () => {
    expect(isNone(fromNullable(null))).toBe(true);
    expect(isNone(fromNullable(undefined))).toBe(true);
    expect(fromNullable(0)).toEqual(some(0));
    expect(fromNullable('')).toEqual(some(''));
  });

  it('maps a present value only', () => {
    expect(mapOption(some(2), (n) => n * 2)).toEqual(some(4));
    expect(isNone(mapOption(none() as ReturnType<typeof none>, (n: number) => n * 2))).toBe(true);
  });

  it('falls back when absent', () => {
    expect(getOrElse(some(1), 9)).toBe(1);
    expect(getOrElse(none(), 9)).toBe(9);
  });
});
