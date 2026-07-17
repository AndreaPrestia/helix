import { type Result, Entity, Identifier, ValidationError, err, ok } from '@helix/core';
import { type Freshness, isStale } from './freshness.js';
import { type KnowledgeKind, isKnowledgeKind } from './kind.js';
import { type KnowledgeLink, isKnowledgeLinkType } from './link.js';

/** Typed identifier for a knowledge artifact (e.g. `KNW-HELIX-001`). */
export type KnowledgeId = Identifier<'knw'>;

/** Input for creating a {@link KnowledgeArticle}. */
export interface KnowledgeArticleInput {
  readonly id: KnowledgeId;
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly body: string;
  readonly owner: string;
  readonly freshness: Freshness;
  readonly links?: readonly KnowledgeLink[];
}

/** Immutable snapshot of a {@link KnowledgeArticle}. */
export interface KnowledgeArticleSnapshot {
  readonly id: string;
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly body: string;
  readonly owner: string;
  readonly reviewedAt: string;
  readonly ttlDays: number;
  readonly links: readonly KnowledgeLink[];
}

function validateLink(link: KnowledgeLink): string | null {
  if (!isKnowledgeLinkType(link.type)) {
    return `invalid link type: ${link.type}`;
  }
  if (link.target.trim() === '') {
    return 'link target must be a non-empty string';
  }
  return null;
}

/**
 * A knowledge artifact — an article, pattern, or anti-pattern — with ownership,
 * freshness metadata, and typed links to decisions and code. Identity-bearing
 * (an {@link Entity}); the knowledge graph references it rather than copying it.
 */
export class KnowledgeArticle extends Entity<KnowledgeId> {
  #kind: KnowledgeKind;
  #title: string;
  #body: string;
  #owner: string;
  #freshness: Freshness;
  #links: KnowledgeLink[];

  private constructor(input: Required<KnowledgeArticleInput>) {
    super(input.id);
    this.#kind = input.kind;
    this.#title = input.title;
    this.#body = input.body;
    this.#owner = input.owner;
    this.#freshness = input.freshness;
    this.#links = [...input.links];
  }

  get kind(): KnowledgeKind {
    return this.#kind;
  }
  get title(): string {
    return this.#title;
  }
  get body(): string {
    return this.#body;
  }
  get owner(): string {
    return this.#owner;
  }
  get freshness(): Freshness {
    return this.#freshness;
  }
  get links(): readonly KnowledgeLink[] {
    return [...this.#links];
  }

  /** Create and validate a knowledge artifact. */
  static create(input: KnowledgeArticleInput): Result<KnowledgeArticle, ValidationError> {
    if (!isKnowledgeKind(input.kind)) {
      return err(new ValidationError(`invalid knowledge kind: ${input.kind}`));
    }
    if (input.title.trim() === '') {
      return err(new ValidationError('title must be a non-empty string'));
    }
    if (input.body.trim() === '') {
      return err(new ValidationError('body must be a non-empty string'));
    }
    if (input.owner.trim() === '') {
      return err(new ValidationError('owner must be a non-empty string'));
    }
    if (input.freshness.ttlDays <= 0) {
      return err(new ValidationError('freshness ttlDays must be greater than zero'));
    }
    for (const link of input.links ?? []) {
      const issue = validateLink(link);
      if (issue !== null) {
        return err(new ValidationError(issue));
      }
    }
    return ok(new KnowledgeArticle({ ...input, links: input.links ?? [] }));
  }

  /** Whether the artifact is stale at the given instant. */
  isStale(now: Date): boolean {
    return isStale(this.#freshness, now);
  }

  /** Refresh the artifact's freshness after a review. */
  review(reviewedAt: Date, ttlDays?: number): Result<KnowledgeArticle, ValidationError> {
    const nextTtl = ttlDays ?? this.#freshness.ttlDays;
    if (nextTtl <= 0) {
      return err(new ValidationError('freshness ttlDays must be greater than zero'));
    }
    this.#freshness = { reviewedAt, ttlDays: nextTtl };
    return ok(this);
  }

  /** Reassign ownership. */
  reassign(owner: string): Result<KnowledgeArticle, ValidationError> {
    if (owner.trim() === '') {
      return err(new ValidationError('owner must be a non-empty string'));
    }
    this.#owner = owner;
    return ok(this);
  }

  /** Add a typed link, ignoring exact duplicates. */
  addLink(link: KnowledgeLink): Result<KnowledgeArticle, ValidationError> {
    const issue = validateLink(link);
    if (issue !== null) {
      return err(new ValidationError(issue));
    }
    const exists = this.#links.some((l) => l.type === link.type && l.target === link.target);
    if (!exists) {
      this.#links.push(link);
    }
    return ok(this);
  }

  toSnapshot(): KnowledgeArticleSnapshot {
    return {
      id: this.id.value,
      kind: this.#kind,
      title: this.#title,
      body: this.#body,
      owner: this.#owner,
      reviewedAt: this.#freshness.reviewedAt.toISOString(),
      ttlDays: this.#freshness.ttlDays,
      links: this.links,
    };
  }

  /** Rehydrate an artifact from a snapshot. */
  static fromSnapshot(
    snapshot: KnowledgeArticleSnapshot,
  ): Result<KnowledgeArticle, ValidationError> {
    const id = Identifier.create('knw', snapshot.id);
    if (!id.ok) {
      return id;
    }
    const reviewedAt = new Date(snapshot.reviewedAt);
    if (Number.isNaN(reviewedAt.getTime())) {
      return err(new ValidationError('invalid reviewedAt timestamp'));
    }
    return KnowledgeArticle.create({
      id: id.value,
      kind: snapshot.kind,
      title: snapshot.title,
      body: snapshot.body,
      owner: snapshot.owner,
      freshness: { reviewedAt, ttlDays: snapshot.ttlDays },
      links: snapshot.links,
    });
  }
}
