import { type Option, fromNullable, none } from '@helix/core';
import type { ReviewEvidence } from './model.js';

/**
 * An append-only log of review evidence captured during self-hosting. The
 * latest evidence per change is retained and every capture is preserved in
 * order, so review outcomes are always observable and auditable (Constitution
 * Article 9). There is no API to delete evidence.
 */
export class ReviewLog {
  readonly #entries: ReviewEvidence[] = [];

  /** Capture a piece of review evidence. */
  capture(evidence: ReviewEvidence): void {
    this.#entries.push(evidence);
  }

  /** The most recent evidence captured for a change, if any. */
  latestFor(changeId: string): Option<ReviewEvidence> {
    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      const entry = this.#entries[index];
      if (entry !== undefined && entry.changeId === changeId) {
        return fromNullable(entry);
      }
    }
    return none();
  }

  /** Every captured evidence entry, in capture order. */
  all(): readonly ReviewEvidence[] {
    return [...this.#entries];
  }
}
