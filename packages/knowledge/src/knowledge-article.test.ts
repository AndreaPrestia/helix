import { Identifier, isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import { KnowledgeArticle, type KnowledgeId } from './knowledge-article.js';

function knowledgeId(value = 'KNW-HELIX-001'): KnowledgeId {
  const id = Identifier.create('knw', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

const reviewedAt = new Date('2026-07-17T00:00:00.000Z');

function validInput(overrides: Partial<Parameters<typeof KnowledgeArticle.create>[0]> = {}) {
  return {
    id: knowledgeId(),
    kind: 'article' as const,
    title: 'Deterministic orchestration',
    body: 'Helix produces the same plan for the same inputs.',
    owner: 'platform-team',
    freshness: { reviewedAt, ttlDays: 90 },
    ...overrides,
  };
}

describe('KnowledgeArticle creation', () => {
  it('creates articles, patterns, and anti-patterns', () => {
    for (const kind of ['article', 'pattern', 'anti_pattern'] as const) {
      const result = KnowledgeArticle.create(validInput({ kind }));
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.kind).toBe(kind);
      }
    }
  });

  it('rejects invalid fields', () => {
    expect(isErr(KnowledgeArticle.create(validInput({ title: '  ' })))).toBe(true);
    expect(isErr(KnowledgeArticle.create(validInput({ body: '' })))).toBe(true);
    expect(isErr(KnowledgeArticle.create(validInput({ owner: '' })))).toBe(true);
    expect(
      isErr(KnowledgeArticle.create(validInput({ freshness: { reviewedAt, ttlDays: 0 } }))),
    ).toBe(true);
  });
});

describe('freshness', () => {
  it('reports staleness relative to the TTL', () => {
    const created = KnowledgeArticle.create(validInput({ freshness: { reviewedAt, ttlDays: 30 } }));
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const article = created.value;
    expect(article.isStale(new Date('2026-07-20T00:00:00.000Z'))).toBe(false);
    expect(article.isStale(new Date('2026-09-01T00:00:00.000Z'))).toBe(true);
  });

  it('refreshes freshness on review', () => {
    const created = KnowledgeArticle.create(validInput({ freshness: { reviewedAt, ttlDays: 30 } }));
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const article = created.value;
    const later = new Date('2026-09-01T00:00:00.000Z');
    expect(article.isStale(later)).toBe(true);
    article.review(later);
    expect(article.isStale(later)).toBe(false);
  });

  it('rejects a non-positive TTL on review', () => {
    const created = KnowledgeArticle.create(validInput());
    if (isOk(created)) {
      expect(isErr(created.value.review(reviewedAt, 0))).toBe(true);
    }
  });
});

describe('ownership', () => {
  it('reassigns to a new owner', () => {
    const created = KnowledgeArticle.create(validInput());
    if (isOk(created)) {
      expect(isOk(created.value.reassign('knowledge-guild'))).toBe(true);
      expect(created.value.owner).toBe('knowledge-guild');
      expect(isErr(created.value.reassign(''))).toBe(true);
    }
  });
});

describe('links to decisions and code', () => {
  it('adds decision and code links and de-duplicates', () => {
    const created = KnowledgeArticle.create(validInput());
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const article = created.value;
    article.addLink({ type: 'decision', target: 'ADR-0006' });
    article.addLink({ type: 'code', target: 'packages/core/src/result.ts' });
    article.addLink({ type: 'decision', target: 'ADR-0006' }); // duplicate
    expect(article.links).toHaveLength(2);
    expect(article.links.map((l) => l.type)).toEqual(['decision', 'code']);
  });

  it('rejects an empty link target', () => {
    const created = KnowledgeArticle.create(validInput());
    if (isOk(created)) {
      expect(isErr(created.value.addLink({ type: 'code', target: '' }))).toBe(true);
    }
  });
});

describe('snapshot', () => {
  it('round-trips through a snapshot', () => {
    const created = KnowledgeArticle.create(
      validInput({ links: [{ type: 'decision', target: 'ADR-0001' }] }),
    );
    if (!isOk(created)) {
      throw new Error('setup failed');
    }
    const snapshot = created.value.toSnapshot();
    const rehydrated = KnowledgeArticle.fromSnapshot(snapshot);
    if (isOk(rehydrated)) {
      expect(rehydrated.value.toSnapshot()).toEqual(snapshot);
    }
  });
});
