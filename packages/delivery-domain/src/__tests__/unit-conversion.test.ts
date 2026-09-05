import { DISPLAY_UNITS, type DisplayUnit } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { fromDisplayValue, toDisplayValue, unitNeedsPricing, type CellPricing } from '../index';

/** A. Okafor in March 2026: 176 h in a person-month, blended €89.5455/h. */
const OKAFOR_MARCH: CellPricing = {
  personMonthHours: 176,
  blendedRate: (8 * 80 + 14 * 95) / 22,
  unpriced: false,
  splitAcrossRates: true,
};

describe('toDisplayValue (R2)', () => {
  it('shows the canonical unit unchanged', () => {
    expect(toDisplayValue(0.5, 'personMonths', OKAFOR_MARCH)).toBe(0.5);
  });

  it('converts 0.50 person-months to 88.00 hours', () => {
    expect(toDisplayValue(0.5, 'hours', OKAFOR_MARCH)).toBe(88);
  });

  it('converts 0.50 person-months to 50.0% of capacity', () => {
    expect(toDisplayValue(0.5, 'percent', OKAFOR_MARCH)).toBe(50);
  });

  it('converts 0.50 person-months to €7,880.00', () => {
    expect(toDisplayValue(0.5, 'cost', OKAFOR_MARCH)).toBeCloseTo(7880, 9);
  });

  it('needs nothing from People for person-months or % of capacity (F9)', () => {
    expect(toDisplayValue(0.5, 'personMonths', null)).toBe(0.5);
    expect(toDisplayValue(0.5, 'percent', null)).toBe(50);
    expect(toDisplayValue(0.5, 'hours', null)).toBeNull();
    expect(toDisplayValue(0.5, 'cost', null)).toBeNull();
  });

  it('agrees with unitNeedsPricing about which units degrade', () => {
    for (const unit of DISPLAY_UNITS) {
      expect(toDisplayValue(0.5, unit, null) === null).toBe(unitNeedsPricing(unit));
    }
  });
});

describe('fromDisplayValue (R2)', () => {
  it('divides a euro edit by the blended rate for the month', () => {
    // "€7,880 of Adaeze's March" is half her month, priced across both rates.
    expect(fromDisplayValue(7880, 'cost', OKAFOR_MARCH)).toBeCloseTo(0.5, 12);
  });

  it('inverts hours and percent', () => {
    expect(fromDisplayValue(88, 'hours', OKAFOR_MARCH)).toBe(0.5);
    expect(fromDisplayValue(50, 'percent', OKAFOR_MARCH)).toBe(0.5);
  });

  it('refuses a euro edit in a month with no rate, rather than inventing effort', () => {
    const unpriced: CellPricing = {
      personMonthHours: 176,
      blendedRate: 0,
      unpriced: true,
      splitAcrossRates: false,
    };

    expect(fromDisplayValue(1000, 'cost', unpriced)).toBeNull();
    // The effort itself is still editable in the units that do not need a price.
    expect(fromDisplayValue(0.5, 'personMonths', unpriced)).toBe(0.5);
  });

  it('refuses hours and cost when People is unreachable', () => {
    expect(fromDisplayValue(88, 'hours', null)).toBeNull();
    expect(fromDisplayValue(7880, 'cost', null)).toBeNull();
  });
});

describe('round tripping (R2: switching units must not change the stored value)', () => {
  it('returns the exact stored value through every unit', () => {
    for (const unit of DISPLAY_UNITS) {
      for (const stored of [0.1, 0.25, 0.5, 0.65, 1, 1.337]) {
        const shown = toDisplayValue(stored, unit, OKAFOR_MARCH);

        expect(shown).not.toBeNull();
        expect(fromDisplayValue(shown as number, unit, OKAFOR_MARCH)).toBeCloseTo(stored, 12);
      }
    }
  });

  it('survives a chain through all four units and back', () => {
    const stored = 0.37;

    const roundTripped = DISPLAY_UNITS.reduce((value: number, unit: DisplayUnit) => {
      const shown = toDisplayValue(value, unit, OKAFOR_MARCH) as number;

      return fromDisplayValue(shown, unit, OKAFOR_MARCH) as number;
    }, stored);

    expect(roundTripped).toBeCloseTo(stored, 12);
  });
});
