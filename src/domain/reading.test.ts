import { describe, expect, it } from 'vitest';
import { chapterState, countUnlocked, isHidden, nextPosition, ratingsRevealed, turnState, validateRange } from './reading';
import type { ChapterRating } from './types';

describe('isHidden', () => {
  it('is never hidden when not sealed', () => {
    expect(isHidden({ chapter: 5, sealed: false, authorId: 'A' }, 'N', 0)).toBe(false);
  });

  it('is never hidden for its own author', () => {
    expect(isHidden({ chapter: 5, sealed: true, authorId: 'N' }, 'N', 0)).toBe(false);
  });

  it('is hidden for the other reader while behind the chapter', () => {
    expect(isHidden({ chapter: 5, sealed: true, authorId: 'A' }, 'N', 3)).toBe(true);
  });

  it('is revealed for the other reader once they reach the chapter', () => {
    expect(isHidden({ chapter: 5, sealed: true, authorId: 'A' }, 'N', 5)).toBe(false);
  });
});

describe('ratingsRevealed', () => {
  const ratingA: ChapterRating = { id: '1', bookId: 'b', chapter: 3, userId: 'A', rating: 4, createdAt: '' };
  const ratingB: ChapterRating = { id: '2', bookId: 'b', chapter: 3, userId: 'B', rating: 5, createdAt: '' };

  it('reveals when both have read and both have rated', () => {
    expect(ratingsRevealed(3, 4, 5, ratingA, ratingB)).toBe(true);
  });

  it('stays hidden if one has not rated yet', () => {
    expect(ratingsRevealed(3, 4, 5, ratingA, undefined)).toBe(false);
  });

  it('stays hidden if one has not read the chapter yet', () => {
    expect(ratingsRevealed(3, 2, 5, ratingA, ratingB)).toBe(false);
  });
});

describe('chapterState', () => {
  it('is both_read when both are at or past the chapter', () => {
    expect(chapterState(3, 4, 5)).toBe('both_read');
  });

  it('is waiting_other when only I have read it', () => {
    expect(chapterState(3, 4, 2)).toBe('waiting_other');
  });

  it('is not_read_by_me otherwise', () => {
    expect(chapterState(3, 1, 5)).toBe('not_read_by_me');
  });
});

describe('turnState', () => {
  it('is my_turn when I am behind', () => {
    expect(turnState(2, 5)).toBe('my_turn');
  });

  it('is their_turn when I am ahead', () => {
    expect(turnState(5, 2)).toBe('their_turn');
  });

  it('is tied when positions match', () => {
    expect(turnState(3, 3)).toBe('tied');
  });
});

describe('validateRange', () => {
  it('accepts a valid range', () => {
    expect(validateRange(2, 5, 12)).toBe(true);
  });

  it('rejects a from below 1', () => {
    expect(validateRange(0, 5, 12)).toBe(false);
  });

  it('rejects a to below from', () => {
    expect(validateRange(5, 4, 12)).toBe(false);
  });

  it('rejects a to beyond total', () => {
    expect(validateRange(2, 13, 12)).toBe(false);
  });
});

describe('nextPosition', () => {
  it('advances to the new chapter', () => {
    expect(nextPosition(3, 6)).toBe(6);
  });

  it('never regresses on a re-read of past chapters', () => {
    expect(nextPosition(6, 4)).toBe(6);
  });
});

describe('countUnlocked', () => {
  const items = [
    { chapter: 2, sealed: true, authorId: 'A' },
    { chapter: 4, sealed: true, authorId: 'A' },
    { chapter: 4, sealed: false, authorId: 'A' },
    { chapter: 4, sealed: true, authorId: 'N' },
    { chapter: 7, sealed: true, authorId: 'A' },
  ];

  it('counts only sealed items from the other author newly covered by the range', () => {
    expect(countUnlocked(items, 'N', 3, 5)).toBe(1);
  });

  it('does not recount items already unlocked before the move', () => {
    expect(countUnlocked(items, 'N', 2, 5)).toBe(1);
  });

  it('returns 0 when nothing new is unlocked', () => {
    expect(countUnlocked(items, 'N', 5, 5)).toBe(0);
  });
});
