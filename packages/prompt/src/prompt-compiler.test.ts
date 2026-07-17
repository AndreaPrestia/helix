import type { ContextSelection } from '@helix/context';
import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { PromptCompiler, type PromptInput } from './prompt-compiler.js';
import { SecretRedactor } from './redaction.js';

const compiler = new PromptCompiler();

describe('PromptCompiler canonical sections and ordering', () => {
  it('emits sections in canonical order regardless of input order', () => {
    const input: PromptInput = {
      sections: [
        { kind: 'output_format', content: 'json' },
        { kind: 'task', content: 'do the thing' },
        { kind: 'system', content: 'you are helix' },
      ],
    };
    const result = compiler.compile(input);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.sections.map((s) => s.kind)).toEqual(['system', 'task', 'output_format']);
    }
  });

  it('merges multiple sections of the same kind in input order', () => {
    const result = compiler.compile({
      sections: [
        { kind: 'governance', content: 'rule A' },
        { kind: 'governance', content: 'rule B' },
      ],
    });
    if (isOk(result)) {
      expect(result.value.sections[0]?.content).toBe('rule A\n\nrule B');
    }
  });

  it('rejects unknown kinds and empty content', () => {
    expect(isErr(compiler.compile({ sections: [{ kind: 'task', content: '  ' }] }))).toBe(true);
    expect(isErr(compiler.compile({ sections: [{ kind: 'nope' as 'task', content: 'x' }] }))).toBe(
      true,
    );
  });
});

describe('PromptCompiler hashable output (deterministic)', () => {
  const input: PromptInput = {
    sections: [
      { kind: 'system', content: 'you are helix' },
      { kind: 'task', content: 'do the thing' },
    ],
  };

  it('produces a stable hash for identical inputs', () => {
    const a = compiler.compile(input);
    const b = compiler.compile(input);
    if (isOk(a) && isOk(b)) {
      expect(a.value.hash).toBe(b.value.hash);
      expect(a.value.hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('changes the hash when content changes', () => {
    const a = compiler.compile(input);
    const b = compiler.compile({ sections: [{ kind: 'system', content: 'different' }] });
    if (isOk(a) && isOk(b)) {
      expect(a.value.hash).not.toBe(b.value.hash);
    }
  });
});

describe('PromptCompiler context integration', () => {
  it('renders selected context into the context section', () => {
    const selection: ContextSelection = {
      manifestId: 'm',
      budget: 100,
      usedTokens: 10,
      selected: [
        { id: 'sym-a', source: 'repository:symbol:a', tokens: 5, priority: 2 },
        { id: 'knw-1', source: 'knowledge:KNW-1', tokens: 5, priority: 1 },
      ],
      excluded: [],
      provenance: [],
    };
    const result = compiler.compile({
      sections: [{ kind: 'task', content: 't' }],
      context: selection,
    });
    if (isOk(result)) {
      const context = result.value.sections.find((s) => s.kind === 'context');
      expect(context?.content).toContain('sym-a (repository:symbol:a)');
      expect(context?.content).toContain('knw-1 (knowledge:KNW-1)');
    }
  });
});

describe('PromptCompiler secret redaction', () => {
  it('redacts secrets and reports the count', () => {
    const result = compiler.compile({
      sections: [
        { kind: 'task', content: 'use api_key: sk-12345 and Authorization: Bearer abc.def-123' },
      ],
    });
    if (isOk(result)) {
      expect(result.value.text).toContain('api_key: [REDACTED]');
      expect(result.value.text).toContain('Bearer [REDACTED]');
      expect(result.value.text).not.toContain('sk-12345');
      expect(result.value.redactions).toBeGreaterThanOrEqual(2);
    }
  });

  it('accepts a custom redactor', () => {
    const redactor = new SecretRedactor([{ pattern: /classified/gi, replacement: '[REDACTED]' }]);
    const result = compiler.compile({
      sections: [{ kind: 'task', content: 'this is classified' }],
      redactor,
    });
    if (isOk(result)) {
      expect(result.value.text).toContain('this is [REDACTED]');
      expect(result.value.redactions).toBe(1);
    }
  });
});
