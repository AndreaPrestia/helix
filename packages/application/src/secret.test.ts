import { describe, expect, it } from 'vitest';
import { REDACTION_PLACEHOLDER, Secret, redactSecrets } from './secret.js';

describe('Secret', () => {
  it('never exposes its value through toString or JSON', () => {
    const secret = new Secret('api-key', 'super-secret-value');
    expect(String(secret)).toBe('[redacted:api-key]');
    expect(JSON.stringify({ secret })).toBe('{"secret":"[redacted:api-key]"}');
    expect(`${secret}`).not.toContain('super-secret-value');
  });

  it('reveals the value only on explicit request', () => {
    const secret = new Secret('token', 'abc123');
    expect(secret.reveal()).toBe('abc123');
    expect(secret.isPresent).toBe(true);
  });

  it('reports an empty secret as absent', () => {
    expect(new Secret('empty', '').isPresent).toBe(false);
  });
});

describe('redactSecrets', () => {
  it('scrubs secret values from text', () => {
    const secret = new Secret('token', 'abc123');
    const redacted = redactSecrets('authorization: abc123 abc123', [secret]);
    expect(redacted).toBe(`authorization: ${REDACTION_PLACEHOLDER} ${REDACTION_PLACEHOLDER}`);
  });

  it('ignores empty secrets to avoid over-redaction', () => {
    const text = 'nothing to hide';
    expect(redactSecrets(text, [new Secret('empty', '')])).toBe(text);
  });

  it('treats secret values literally, not as regex', () => {
    const secret = new Secret('pattern', 'a.b*c');
    expect(redactSecrets('value a.b*c here', [secret])).toBe(`value ${REDACTION_PLACEHOLDER} here`);
  });
});
