import { type Option, type Result, err, fromNullable, ok } from '@helix/core';
import { ThreatValidationError } from './errors.js';

/** STRIDE threat categories. */
export const threatCategories = [
  'spoofing',
  'tampering',
  'repudiation',
  'information_disclosure',
  'denial_of_service',
  'elevation_of_privilege',
] as const;
export type ThreatCategory = (typeof threatCategories)[number];

/** The mitigation status of a threat. */
export type MitigationStatus = 'planned' | 'implemented' | 'accepted_risk';

/** A single catalogued threat and its mitigation. */
export interface Threat {
  readonly id: string;
  readonly category: ThreatCategory;
  readonly description: string;
  readonly mitigation: string;
  readonly status: MitigationStatus;
}

function isCategory(value: string): value is ThreatCategory {
  return (threatCategories as readonly string[]).includes(value);
}

/**
 * A registry of catalogued threats (STRIDE-based). Threats are validated on
 * registration and listed deterministically; a threat counts as covered once it
 * is `implemented` or an explicitly `accepted_risk`. No hidden global state.
 */
export class ThreatModel {
  readonly #threats = new Map<string, Threat>();

  /** Register a threat. Fails on invalid fields or a duplicate id. */
  register(threat: Threat): Result<void, ThreatValidationError> {
    const issues: string[] = [];
    if (threat.id.trim() === '') {
      issues.push('id must not be empty');
    } else if (this.#threats.has(threat.id)) {
      issues.push(`duplicate threat id "${threat.id}"`);
    }
    if (!isCategory(threat.category)) {
      issues.push(`invalid category "${threat.category}"`);
    }
    if (threat.description.trim() === '') {
      issues.push('description must not be empty');
    }
    if (threat.mitigation.trim() === '') {
      issues.push('mitigation must not be empty');
    }
    if (issues.length > 0) {
      return err(new ThreatValidationError(issues));
    }
    this.#threats.set(threat.id, threat);
    return ok(undefined);
  }

  /** Get a threat by id. */
  get(id: string): Option<Threat> {
    return fromNullable(this.#threats.get(id));
  }

  /** Every threat, id-sorted. */
  list(): readonly Threat[] {
    return [...this.#threats.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Threats in a category, id-sorted. */
  byCategory(category: ThreatCategory): readonly Threat[] {
    return this.list().filter((threat) => threat.category === category);
  }

  /** Threats that are still only `planned` (not yet covered), id-sorted. */
  unmitigated(): readonly Threat[] {
    return this.list().filter((threat) => threat.status === 'planned');
  }

  /** Fraction of threats that are covered (`implemented` or `accepted_risk`). */
  coverageRatio(): number {
    const all = this.list();
    if (all.length === 0) {
      return 1;
    }
    const covered = all.filter((threat) => threat.status !== 'planned').length;
    return covered / all.length;
  }
}
