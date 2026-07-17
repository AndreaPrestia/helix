import { describe, expect, it } from 'vitest';
import { formatOutput } from './output.js';

describe('formatOutput', () => {
  it('renders strings verbatim in text mode', () => {
    expect(formatOutput('hello', 'text')).toBe('hello');
  });

  it('pretty-prints structured values in text mode', () => {
    expect(formatOutput({ a: 1 }, 'text')).toBe('{\n  "a": 1\n}');
  });

  it('renders empty string for undefined in text mode', () => {
    expect(formatOutput(undefined, 'text')).toBe('');
  });

  it('renders canonical JSON', () => {
    expect(formatOutput({ a: 1 }, 'json')).toBe('{"a":1}');
  });

  it('renders null for undefined in JSON mode', () => {
    expect(formatOutput(undefined, 'json')).toBe('null');
  });
});
