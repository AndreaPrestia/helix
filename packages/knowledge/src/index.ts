/**
 * `@helix/knowledge` — the knowledge model.
 *
 * Rich domain model for knowledge artifacts (articles, patterns, anti-patterns)
 * with ownership, freshness metadata, and typed links to decisions and code.
 * Depends only on the provider-agnostic `@helix/core`.
 */

export { knowledgeKinds, isKnowledgeKind, type KnowledgeKind } from './kind.js';
export {
  knowledgeLinkTypes,
  isKnowledgeLinkType,
  type KnowledgeLink,
  type KnowledgeLinkType,
} from './link.js';
export { isStale, type Freshness } from './freshness.js';
export {
  KnowledgeArticle,
  type KnowledgeId,
  type KnowledgeArticleInput,
  type KnowledgeArticleSnapshot,
} from './knowledge-article.js';
