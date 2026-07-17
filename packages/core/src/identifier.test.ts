import { describe, expect, it } from 'vitest';
import { Identifier } from './identifier.js';
import { isErr, isOk } from './result.js';

describe('Identifier', () => {
  it('creates a valid identifier', () => {
    const result = Identifier.create('ws', 'ws_123');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.value).toBe('ws_123');
      expect(result.value.tag).toBe('ws');
      expect(result.value.toString()).toBe('ws_123');
    }
  });

  it('rejects an empty or whitespace value', () => {
    expect(isErr(Identifier.create('ws', ''))).toBe(true);
    expect(isErr(Identifier.create('ws', '   '))).toBe(true);
  });

  it('reports a validation error code on failure', () => {
    const result = Identifier.create('ws', '');
    if (isErr(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('is equal for the same tag and value', () => {
    const a = Identifier.create('ws', 'ws_1');
    const b = Identifier.create('ws', 'ws_1');
    if (isOk(a) && isOk(b)) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('is not equal across different tags', () => {
    const a = Identifier.create('ws', 'x_1');
    const b = Identifier.create('prj', 'x_1');
    if (isOk(a) && isOk(b)) {
      expect(a.value.equals(b.value as unknown as typeof a.value)).toBe(false);
    }
  });
});
