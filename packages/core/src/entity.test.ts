import { describe, expect, it } from 'vitest';
import { Entity } from './entity.js';
import { Identifier } from './identifier.js';
import { isOk } from './result.js';

function makeId(value: string): Identifier<'user'> {
  const result = Identifier.create('user', value);
  if (!isOk(result)) {
    throw new Error('unexpected invalid id in test');
  }
  return result.value;
}

class User extends Entity<Identifier<'user'>> {
  constructor(
    id: Identifier<'user'>,
    readonly name: string,
  ) {
    super(id);
  }
}

describe('Entity', () => {
  it('is equal when identity matches, regardless of other attributes', () => {
    const id = makeId('u-1');
    expect(new User(id, 'Ada').equals(new User(id, 'Grace'))).toBe(true);
  });

  it('is not equal when identity differs', () => {
    expect(new User(makeId('u-1'), 'Ada').equals(new User(makeId('u-2'), 'Ada'))).toBe(false);
  });

  it('compares value-object identifiers structurally', () => {
    expect(new User(makeId('u-1'), 'Ada').equals(new User(makeId('u-1'), 'Ada'))).toBe(true);
  });

  it('is not equal to null or undefined', () => {
    expect(new User(makeId('u-1'), 'Ada').equals(undefined)).toBe(false);
    expect(new User(makeId('u-1'), 'Ada').equals(null)).toBe(false);
  });

  it('exposes its identity', () => {
    const id = makeId('u-1');
    expect(new User(id, 'Ada').id).toBe(id);
  });
});
