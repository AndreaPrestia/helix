import { describe, expect, it } from 'vitest';
import { ReviewLog } from './review-log.js';
import type { ReviewEvidence } from './model.js';

function evidence(changeId: string, approved: boolean): ReviewEvidence {
  return { changeId, reviewer: 'self-hosting', approved, findings: [] };
}

describe('ReviewLog', () => {
  it('captures and retrieves the latest evidence for a change', () => {
    const log = new ReviewLog();
    log.capture(evidence('0030', false));
    log.capture(evidence('0030', true));
    const latest = log.latestFor('0030');
    expect(latest.some && latest.value.approved).toBe(true);
  });

  it('returns none for a change with no evidence', () => {
    expect(new ReviewLog().latestFor('missing').some).toBe(false);
  });

  it('preserves every captured entry in order', () => {
    const log = new ReviewLog();
    log.capture(evidence('a', true));
    log.capture(evidence('b', false));
    expect(log.all().map((e) => e.changeId)).toEqual(['a', 'b']);
  });
});
