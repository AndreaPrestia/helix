import { Identifier, type IdGenerator, isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import type { ReviewDependencies, ReviewId } from './review.js';
import { Review } from './review.js';

class SequentialIdGenerator implements IdGenerator {
  #counter = 0;
  next(): string {
    this.#counter += 1;
    return `find_${this.#counter}`;
  }
}

function makeDeps(): ReviewDependencies {
  return { ids: new SequentialIdGenerator() };
}

function reviewId(value = 'rev_1'): ReviewId {
  const id = Identifier.create('rev', value);
  if (!isOk(id)) {
    throw new Error('unexpected invalid id');
  }
  return id.value;
}

function openReview(): Review {
  const opened = Review.open(reviewId(), { author: 'ada', reviewer: 'grace' });
  if (!isOk(opened)) {
    throw new Error('setup failed');
  }
  return opened.value;
}

describe('Review contracts and independent reviewer', () => {
  it('opens with an independent reviewer', () => {
    const review = openReview();
    expect(review.state).toBe('in_review');
    expect(review.author).toBe('ada');
    expect(review.reviewer).toBe('grace');
    expect(review.round).toBe(1);
  });

  it('rejects a reviewer that is the author', () => {
    const result = Review.open(reviewId(), { author: 'ada', reviewer: 'ada' });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('REVIEWER_NOT_INDEPENDENT');
    }
  });

  it('rejects empty author or reviewer', () => {
    expect(isErr(Review.open(reviewId(), { author: '', reviewer: 'grace' }))).toBe(true);
    expect(isErr(Review.open(reviewId(), { author: 'ada', reviewer: '  ' }))).toBe(true);
  });
});

describe('Review findings severity', () => {
  it('records findings with a severity and message', () => {
    const review = openReview();
    const result = review.addFinding({ severity: 'major', message: 'missing tests' }, makeDeps());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.severity).toBe('major');
      expect(review.findings).toHaveLength(1);
    }
  });

  it('rejects invalid severity or empty message', () => {
    const review = openReview();
    const deps = makeDeps();
    expect(isErr(review.addFinding({ severity: 'critical' as 'major', message: 'x' }, deps))).toBe(
      true,
    );
    expect(isErr(review.addFinding({ severity: 'minor', message: '' }, deps))).toBe(true);
  });
});

describe('Review approval rules', () => {
  it('approves when no blocking findings exist', () => {
    const review = openReview();
    review.addFinding({ severity: 'minor', message: 'nit' }, makeDeps());
    expect(isOk(review.approve())).toBe(true);
    expect(review.state).toBe('approved');
  });

  it('blocks approval when a blocking finding is open', () => {
    const review = openReview();
    review.addFinding({ severity: 'blocking', message: 'security hole' }, makeDeps());
    const result = review.approve();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('REVIEW_APPROVAL_BLOCKED');
    }
    expect(review.state).toBe('in_review');
  });

  it('honors a custom approval policy', () => {
    const review = openReview();
    review.addFinding({ severity: 'major', message: 'perf' }, makeDeps());
    expect(isErr(review.approve({ blockingSeverities: ['major', 'blocking'] }))).toBe(true);
  });
});

describe('Review rework loop', () => {
  it('requests changes then resubmits into a fresh round', () => {
    const review = openReview();
    review.addFinding({ severity: 'blocking', message: 'fix this' }, makeDeps());
    expect(isOk(review.requestChanges())).toBe(true);
    expect(review.state).toBe('changes_requested');

    const resubmitted = review.resubmit();
    expect(isOk(resubmitted)).toBe(true);
    expect(review.state).toBe('in_review');
    expect(review.findings).toHaveLength(0); // fresh round
    expect(review.round).toBe(2);

    // Second round can now approve cleanly.
    expect(isOk(review.approve())).toBe(true);
  });

  it('cannot request changes without findings', () => {
    const review = openReview();
    expect(isErr(review.requestChanges())).toBe(true);
  });

  it('cannot resubmit unless changes were requested', () => {
    const review = openReview();
    expect(isErr(review.resubmit())).toBe(true);
  });

  it('cannot approve or add findings once approved', () => {
    const review = openReview();
    review.approve();
    expect(isErr(review.approve())).toBe(true);
    expect(isErr(review.addFinding({ severity: 'minor', message: 'late' }, makeDeps()))).toBe(true);
  });
});
