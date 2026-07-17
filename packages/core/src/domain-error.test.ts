import { describe, expect, it } from 'vitest';
import { DomainError, InvariantViolation, ValidationError } from './domain-error.js';

describe('DomainError', () => {
  it('exposes a stable code and the concrete class name', () => {
    const error = new InvariantViolation('nope');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('INVARIANT_VIOLATION');
    expect(error.name).toBe('InvariantViolation');
    expect(error.message).toBe('nope');
  });

  it('carries a distinct code per error type', () => {
    expect(new ValidationError('bad').code).toBe('VALIDATION_ERROR');
  });

  it('preserves an error cause', () => {
    const cause = new Error('root');
    const error = new ValidationError('bad', { cause });
    expect(error.cause).toBe(cause);
  });
});
