import { describe, expect, it } from 'vitest';

import { atmStrike, daysUntil, formatPoints, nearSpotRows } from './chainFormat';

const rows = [80, 85, 90, 95, 100, 105, 110, 115, 120].map((strike) => ({ strike }));

describe('chain formatting', () => {
  it('centers the strike window on the at-the-money strike', () => {
    expect(nearSpotRows(rows, 101, 3).map((row) => row.strike)).toEqual([95, 100, 105]);
    expect(nearSpotRows(rows, 70, 3).map((row) => row.strike)).toEqual([80, 85, 90]);
    expect(nearSpotRows(rows, 500, 3).map((row) => row.strike)).toEqual([110, 115, 120]);
    expect(nearSpotRows(rows, 100, 20)).toBe(rows);
  });

  it('finds the at-the-money strike', () => {
    expect(atmStrike(rows, 103)).toBe(105);
    expect(atmStrike([], 103)).toBeNull();
  });

  it('writes skew in signed points and counts days to expiry', () => {
    expect(formatPoints(0.032)).toBe('+3.2 pts');
    expect(formatPoints(-0.015)).toBe('−1.5 pts');
    expect(daysUntil('2026-11-20', '2026-10-29')).toBe(22);
  });
});
