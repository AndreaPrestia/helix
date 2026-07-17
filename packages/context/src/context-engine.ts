import { type Result, err, ok } from '@helix/core';
import { DuplicateCandidateError, type ContextError, InvalidManifestError } from './errors.js';
import type {
  ContextCandidate,
  ContextManifest,
  ContextSelection,
  ExcludedItem,
  ProvenanceEntry,
  SelectedItem,
} from './model.js';

/**
 * Selects context deterministically from a {@link ContextManifest}. Given the
 * same manifest, the engine always produces the same selection, provenance, and
 * ordering (Constitution Article 3): candidates are excluded by rule, then
 * ordered by priority (desc), token cost (asc), and id (asc), then packed greedily
 * within the token budget. Every decision is recorded as provenance (Article 6),
 * and nothing that fails to fit is silently dropped (Article 7).
 */
export class ContextEngine {
  select(manifest: ContextManifest): Result<ContextSelection, ContextError> {
    if (manifest.budget < 0) {
      return err(new InvalidManifestError('budget must be greater than or equal to zero'));
    }

    const seen = new Set<string>();
    for (const candidate of manifest.candidates) {
      if (candidate.tokens < 0) {
        return err(new InvalidManifestError(`candidate ${candidate.id} tokens must be >= 0`));
      }
      if (seen.has(candidate.id)) {
        return err(new DuplicateCandidateError(candidate.id));
      }
      seen.add(candidate.id);
    }

    const excludeIds = new Set(manifest.excludeIds ?? []);
    const excludeTags = new Set(manifest.excludeTags ?? []);

    const provenance: ProvenanceEntry[] = [];
    const excluded: ExcludedItem[] = [];
    const eligible: ContextCandidate[] = [];

    for (const candidate of manifest.candidates) {
      if (excludeIds.has(candidate.id)) {
        excluded.push({ id: candidate.id, source: candidate.source, reason: 'excluded_by_id' });
        provenance.push({
          id: candidate.id,
          source: candidate.source,
          decision: 'excluded',
          reason: 'excluded_by_id',
        });
        continue;
      }
      const excludedTag = candidate.tags.find((tag) => excludeTags.has(tag));
      if (excludedTag !== undefined) {
        excluded.push({ id: candidate.id, source: candidate.source, reason: 'excluded_by_tag' });
        provenance.push({
          id: candidate.id,
          source: candidate.source,
          decision: 'excluded',
          reason: 'excluded_by_tag',
        });
        continue;
      }
      eligible.push(candidate);
    }

    const ordered = [...eligible].sort(
      (a, b) => b.priority - a.priority || a.tokens - b.tokens || a.id.localeCompare(b.id),
    );

    const selected: SelectedItem[] = [];
    let usedTokens = 0;
    for (const candidate of ordered) {
      if (usedTokens + candidate.tokens <= manifest.budget) {
        selected.push({
          id: candidate.id,
          source: candidate.source,
          tokens: candidate.tokens,
          priority: candidate.priority,
        });
        usedTokens += candidate.tokens;
        provenance.push({ id: candidate.id, source: candidate.source, decision: 'included' });
      } else {
        excluded.push({ id: candidate.id, source: candidate.source, reason: 'over_budget' });
        provenance.push({
          id: candidate.id,
          source: candidate.source,
          decision: 'excluded',
          reason: 'over_budget',
        });
      }
    }

    return ok({
      manifestId: manifest.id,
      budget: manifest.budget,
      usedTokens,
      selected,
      excluded: [...excluded].sort((a, b) => a.id.localeCompare(b.id)),
      provenance: [...provenance].sort((a, b) => a.id.localeCompare(b.id)),
    });
  }
}
