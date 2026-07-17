/**
 * `@helix/context` — the context engine.
 *
 * Deterministically selects bounded context from a manifest: it applies
 * priority and exclusion rules, respects a token budget, and records provenance
 * for every decision (Constitution Articles 3, 6, 7). The engine is
 * source-agnostic — callers supply candidates derived from the repository graph,
 * knowledge model, or specifications. Depends only on `@helix/core`.
 */

export type {
  ContextCandidate,
  ContextManifest,
  ContextSelection,
  SelectedItem,
  ExcludedItem,
  ProvenanceEntry,
  ExclusionReason,
} from './model.js';
export { ContextError, InvalidManifestError, DuplicateCandidateError } from './errors.js';
export { ContextEngine } from './context-engine.js';
