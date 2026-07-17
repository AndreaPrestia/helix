/**
 * The Conflict Impact Atlas product domain.
 *
 * This module is deliberately self-contained: it imports nothing from
 * `@helix/*`. The product's domain concepts live in the product project, never
 * inside Helix core — Helix governs and builds the product without absorbing
 * its domain (dogfood requirement: keep product domain outside Helix core).
 */

/** Severity of a conflict. */
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

/** A product-domain conflict entry. */
export interface Conflict {
  readonly id: string;
  readonly title: string;
  readonly severity: ConflictSeverity;
  /** Ids of areas impacted by this conflict. */
  readonly impacts: readonly string[];
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/** An in-memory atlas of conflicts and the areas they impact. */
export class ImpactAtlas {
  readonly #conflicts = new Map<string, Conflict>();

  /** Add or replace a conflict by id. */
  add(conflict: Conflict): void {
    this.#conflicts.set(conflict.id, conflict);
  }

  /** Every conflict, id-sorted. */
  conflicts(): readonly Conflict[] {
    return [...this.#conflicts.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Conflicts impacting a given area, ordered by descending severity then id. */
  impacting(area: string): readonly Conflict[] {
    return this.conflicts()
      .filter((conflict) => conflict.impacts.includes(area))
      .sort(
        (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id),
      );
  }
}
