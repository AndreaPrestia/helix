import { describe, expect, it } from 'vitest';
import { ValueObject } from './value-object.js';

class Money extends ValueObject<{ readonly amount: number; readonly currency: string }> {
  constructor(amount: number, currency: string) {
    super({ amount, currency });
  }
}

class Weight extends ValueObject<{ readonly amount: number; readonly currency: string }> {
  constructor(amount: number, currency: string) {
    super({ amount, currency });
  }
}

describe('ValueObject', () => {
  it('is equal when type and properties match', () => {
    expect(new Money(10, 'EUR').equals(new Money(10, 'EUR'))).toBe(true);
  });

  it('is not equal when properties differ', () => {
    expect(new Money(10, 'EUR').equals(new Money(10, 'USD'))).toBe(false);
  });

  it('is not equal across different value-object types', () => {
    expect(new Money(10, 'EUR').equals(new Weight(10, 'EUR') as unknown as Money)).toBe(false);
  });

  it('is not equal to null or undefined', () => {
    expect(new Money(1, 'EUR').equals(undefined)).toBe(false);
    expect(new Money(1, 'EUR').equals(null)).toBe(false);
  });

  it('is immutable', () => {
    const money = new Money(1, 'EUR');
    expect(() => {
      (money as unknown as { props: { amount: number } }).props.amount = 2;
    }).toThrow();
  });
});
