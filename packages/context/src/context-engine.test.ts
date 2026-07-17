import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { ContextEngine } from './context-engine.js';
import type { ContextCandidate, ContextManifest } from './model.js';

function candidate(
  id: string,
  tokens: number,
  priority: number,
  tags: readonly string[] = [],
): ContextCandidate {
  return { id, source: `src:${id}`, tokens, priority, tags };
}

const engine = new ContextEngine();

describe('ContextEngine manifest validation', () => {
  it('rejects a negative budget', () => {
    const result = engine.select({ id: 'm', budget: -1, candidates: [] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_CONTEXT_MANIFEST');
    }
  });

  it('rejects negative token costs', () => {
    expect(isErr(engine.select({ id: 'm', budget: 10, candidates: [candidate('a', -1, 1)] }))).toBe(
      true,
    );
  });

  it('rejects duplicate candidate ids', () => {
    const result = engine.select({
      id: 'm',
      budget: 10,
      candidates: [candidate('a', 1, 1), candidate('a', 2, 2)],
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('DUPLICATE_CONTEXT_CANDIDATE');
    }
  });
});

describe('ContextEngine selection', () => {
  it('selects by priority within the token budget', () => {
    const manifest: ContextManifest = {
      id: 'm',
      budget: 100,
      candidates: [candidate('low', 60, 1), candidate('high', 60, 10)],
    };
    const result = engine.select(manifest);
    if (isOk(result)) {
      expect(result.value.selected.map((s) => s.id)).toEqual(['high']);
      expect(result.value.usedTokens).toBe(60);
      const overBudget = result.value.excluded.find((e) => e.id === 'low');
      expect(overBudget?.reason).toBe('over_budget');
    }
  });

  it('breaks ties by token cost then id (deterministic)', () => {
    const manifest: ContextManifest = {
      id: 'm',
      budget: 1000,
      candidates: [candidate('b', 10, 5), candidate('a', 10, 5), candidate('c', 5, 5)],
    };
    const first = engine.select(manifest);
    const second = engine.select(manifest);
    if (isOk(first) && isOk(second)) {
      expect(first.value.selected.map((s) => s.id)).toEqual(['c', 'a', 'b']);
      expect(first).toEqual(second);
    }
  });

  it('applies id and tag exclusion rules', () => {
    const manifest: ContextManifest = {
      id: 'm',
      budget: 1000,
      candidates: [
        candidate('keep', 10, 1),
        candidate('drop-id', 10, 9),
        candidate('drop-tag', 10, 9, ['secret']),
      ],
      excludeIds: ['drop-id'],
      excludeTags: ['secret'],
    };
    const result = engine.select(manifest);
    if (isOk(result)) {
      expect(result.value.selected.map((s) => s.id)).toEqual(['keep']);
      const reasons = Object.fromEntries(result.value.excluded.map((e) => [e.id, e.reason]));
      expect(reasons['drop-id']).toBe('excluded_by_id');
      expect(reasons['drop-tag']).toBe('excluded_by_tag');
    }
  });

  it('records provenance for every candidate', () => {
    const manifest: ContextManifest = {
      id: 'm',
      budget: 5,
      candidates: [candidate('a', 5, 2), candidate('b', 5, 1)],
    };
    const result = engine.select(manifest);
    if (isOk(result)) {
      expect(result.value.provenance).toHaveLength(2);
      const byId = Object.fromEntries(result.value.provenance.map((p) => [p.id, p]));
      expect(byId['a']?.decision).toBe('included');
      expect(byId['a']?.source).toBe('src:a');
      expect(byId['b']?.decision).toBe('excluded');
      expect(byId['b']?.reason).toBe('over_budget');
    }
  });

  it('selects everything when the budget is ample', () => {
    const manifest: ContextManifest = {
      id: 'm',
      budget: 1000,
      candidates: [candidate('a', 1, 1), candidate('b', 1, 1)],
    };
    const result = engine.select(manifest);
    if (isOk(result)) {
      expect(result.value.selected).toHaveLength(2);
      expect(result.value.excluded).toHaveLength(0);
      expect(result.value.usedTokens).toBe(2);
    }
  });
});
