/** A candidate piece of context that may be selected into a prompt. */
export interface ContextCandidate {
  readonly id: string;
  /** Provenance source, e.g. `repository:symbol:...` or `knowledge:KNW-HELIX-001`. */
  readonly source: string;
  /** Token cost of including this candidate (must be >= 0). */
  readonly tokens: number;
  /** Selection priority; higher is preferred. */
  readonly priority: number;
  /** Tags used by exclusion rules. */
  readonly tags: readonly string[];
}

/** A request describing candidate context, a token budget, and exclusion rules. */
export interface ContextManifest {
  readonly id: string;
  /** Maximum total tokens to select (must be >= 0). */
  readonly budget: number;
  readonly candidates: readonly ContextCandidate[];
  /** Candidate ids to exclude outright. */
  readonly excludeIds?: readonly string[];
  /** Any candidate carrying one of these tags is excluded. */
  readonly excludeTags?: readonly string[];
}

/** Why a candidate was excluded from the selection. */
export type ExclusionReason = 'excluded_by_id' | 'excluded_by_tag' | 'over_budget';

/** A selected context item. */
export interface SelectedItem {
  readonly id: string;
  readonly source: string;
  readonly tokens: number;
  readonly priority: number;
}

/** An excluded context item and the reason. */
export interface ExcludedItem {
  readonly id: string;
  readonly source: string;
  readonly reason: ExclusionReason;
}

/** A per-candidate provenance record explaining the decision. */
export interface ProvenanceEntry {
  readonly id: string;
  readonly source: string;
  readonly decision: 'included' | 'excluded';
  readonly reason?: ExclusionReason;
}

/** The deterministic result of selecting context for a manifest. */
export interface ContextSelection {
  readonly manifestId: string;
  readonly budget: number;
  readonly usedTokens: number;
  /** Selected items, in selection (priority) order. */
  readonly selected: readonly SelectedItem[];
  /** Excluded items, sorted by id. */
  readonly excluded: readonly ExcludedItem[];
  /** Provenance for every candidate, sorted by id. */
  readonly provenance: readonly ProvenanceEntry[];
}
