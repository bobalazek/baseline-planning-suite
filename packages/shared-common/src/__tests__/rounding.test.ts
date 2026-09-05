import { describe, expect, it } from 'vitest';

import { distributeRounded, roundTo, sum } from '../index';

describe('roundTo', () => {
  it('rounds half up despite binary representation', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(89.54545454545455, 4)).toBe(89.5455);
  });

  it('is symmetric about zero', () => {
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(roundTo(-2.5, 0)).toBe(-3);
  });
});

describe('distributeRounded (R3)', () => {
  it('is the fix for the naive case where independent rounding overshoots', () => {
    // Each sixth rounds up on its own to 0.17, printing a column of 0.51 under a total of 0.50.
    const cells = [1 / 6, 1 / 6, 1 / 6];

    expect(roundTo(sum(cells.map((cell) => roundTo(cell, 2))), 2)).toBe(0.51);
    expect(roundTo(sum(cells), 2)).toBe(0.5);

    const distributed = distributeRounded(cells, 2);

    expect(roundTo(sum(distributed), 2)).toBe(0.5);
    expect(distributed).toEqual([0.17, 0.17, 0.16]);
  });

  it('makes rounded cells add to the rounded total exactly', () => {
    const cells = [1.005, 1.005, 1.005];
    const rounded = distributeRounded(cells, 2);

    expect(roundTo(sum(rounded), 2)).toBe(roundTo(sum(cells), 2));
    expect(roundTo(sum(rounded), 2)).toBe(3.02);
  });

  it('claws back when the whole rounds down', () => {
    const rounded = distributeRounded([0.996, 0.996, 0.996], 2);

    expect(roundTo(sum(rounded), 2)).toBe(2.99);
    expect(rounded.filter((value) => value === 1.0)).toHaveLength(2);
  });

  it('never moves a cell by more than one unit in the last place', () => {
    const cells = [0.129, 4.5551, 12.0049, 0.0001, 7.777];

    distributeRounded(cells, 2).forEach((value, index) => {
      expect(Math.abs(value - (cells[index] as number))).toBeLessThanOrEqual(0.01 + 1e-9);
    });
  });

  it('is stable — equal remainders break on index, not on sort order', () => {
    const cells = [0.125, 0.125, 0.125, 0.125];

    expect(distributeRounded(cells, 2)).toEqual(distributeRounded(cells, 2));
    expect(distributeRounded(cells, 2)).toEqual([0.13, 0.13, 0.12, 0.12]);
  });

  it('holds for every precision the grid displays', () => {
    const cells = [12.3456, 0.5001, 88.8888, 1.1111, 0.0005];

    for (const decimals of [1, 2, 4]) {
      expect(roundTo(sum(distributeRounded(cells, decimals)), decimals)).toBe(
        roundTo(sum(cells), decimals)
      );
    }
  });

  it('handles the empty and singleton cases', () => {
    expect(distributeRounded([], 2)).toEqual([]);
    expect(distributeRounded([1.005], 2)).toEqual([1.01]);
  });
});
