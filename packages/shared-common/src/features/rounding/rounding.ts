/**
 * Display rounding. Everything upstream of this module works in exact doubles; nothing downstream
 * of it is ever fed back into a calculation.
 */

/** Half-up at a fixed number of decimals, symmetric about zero. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const scale = 10 ** decimals;
  const scaled = value * scale;
  // `Math.round` alone breaks on values a double cannot hold exactly: 1.005 * 100 is 100.49999…,
  // which rounds to 1.00. Nudging away from zero by an epsilon recovers the decimal intent.
  const nudged = scaled + Math.sign(scaled) * EPSILON;

  return (scaled < 0 ? -Math.round(-nudged) : Math.round(nudged)) / scale;
}

/**
 * Round a list of exact values so that the rounded parts sum **exactly** to the rounded whole
 * (R3) — largest-remainder apportionment.
 *
 * Rounding each cell independently and rounding their sum are different operations, and the
 * difference is what a reviewer sees when a column of 2 dp figures adds up to a penny more than
 * the total printed underneath it. Here the whole is rounded once and the cells are made to agree
 * with it: every cell is floored, and the leftover units are handed out one at a time to the cells
 * with the largest discarded fraction — or taken back from the smallest, when the whole rounds
 * down.
 *
 * Returned values differ from independent rounding by at most one unit in the last place.
 */
export function distributeRounded(values: readonly number[], decimals: number): number[] {
  if (values.length === 0) {
    return [];
  }

  const scale = 10 ** decimals;
  const target = Math.round(sum(values) * scale + EPSILON);

  const floors: number[] = [];
  const fractions: number[] = [];

  for (const value of values) {
    const scaled = value * scale;
    const floor = Math.floor(scaled + EPSILON);

    floors.push(floor);
    fractions.push(scaled - floor);
  }

  let shortfall = target - floors.reduce((total, units) => total + units, 0);

  // Hand out (or claw back) whole units in remainder order. Ties break on the earlier index so the
  // result is a pure function of its input and a grid does not reshuffle between renders.
  const byRemainder = floors
    .map((_, index) => index)
    .sort((a, b) => (fractions[b] ?? 0) - (fractions[a] ?? 0) || a - b);

  for (let step = 0; shortfall > 0 && step < byRemainder.length; step += 1) {
    const index = byRemainder[step] as number;

    floors[index] = (floors[index] as number) + 1;
    shortfall -= 1;
  }

  for (let step = 0; shortfall < 0 && step < byRemainder.length; step += 1) {
    const index = byRemainder[byRemainder.length - 1 - step] as number;

    floors[index] = (floors[index] as number) - 1;
    shortfall += 1;
  }

  return floors.map((units) => units / scale);
}

export function sum(values: readonly number[]): number {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}

const EPSILON = 1e-9;
