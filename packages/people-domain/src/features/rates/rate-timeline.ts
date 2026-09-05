import type { IsoDate, RateRecord, RateRecordId } from '@repo/shared-common';

/**
 * An employee's rate records in effective order.
 *
 * A record runs from its `validFrom` until the next one begins, and the last one has no end (R1).
 * Nothing here stores an end date: an end is a fact derived from the neighbour, and persisting it
 * is how two records end up disagreeing about who owns a given day.
 */
export interface RateTimeline {
  readonly records: readonly RateRecord[];
}

/** Sorts ascending by `validFrom`, breaking ties on id so the order is total and reproducible. */
export function buildRateTimeline(records: readonly RateRecord[]): RateTimeline {
  return {
    records: [...records].sort(
      (a, b) => compareStrings(a.validFrom, b.validFrom) || compareStrings(a.id, b.id)
    ),
  };
}

/** The rate in force on a date, or `null` before the first record — those days cost zero (R1). */
export function rateOn(timeline: RateTimeline, date: IsoDate): number | null {
  let effective: number | null = null;

  for (const record of timeline.records) {
    if (record.validFrom > date) {
      break;
    }

    effective = record.hourlyCost;
  }

  return effective;
}

export function firstRateDate(timeline: RateTimeline): IsoDate | null {
  return timeline.records[0]?.validFrom ?? null;
}

export type RateEditProblem =
  | { readonly kind: 'duplicate-valid-from'; readonly validFrom: IsoDate }
  | { readonly kind: 'negative-cost'; readonly hourlyCost: number }
  | { readonly kind: 'unknown-record'; readonly rateRecordId: RateRecordId };

/**
 * Whether a proposed set of records for one employee is a legal timeline.
 *
 * Two records sharing a `validFrom` is the one state the domain genuinely cannot answer — both
 * claim the same day and R1 gives no tie-break — so it is rejected rather than silently resolved.
 * Everything else the brief asks for is allowed, including a retroactive rate that changes what
 * last quarter cost.
 */
export function validateRateRecords(records: readonly RateRecord[]): RateEditProblem[] {
  const problems: RateEditProblem[] = [];
  const seenDates = new Set<IsoDate>();

  for (const record of records) {
    if (seenDates.has(record.validFrom)) {
      problems.push({ kind: 'duplicate-valid-from', validFrom: record.validFrom });
    }

    seenDates.add(record.validFrom);

    if (record.hourlyCost < 0) {
      problems.push({ kind: 'negative-cost', hourlyCost: record.hourlyCost });
    }
  }

  return problems;
}

export function describeRateProblem(problem: RateEditProblem): string {
  switch (problem.kind) {
    case 'duplicate-valid-from':
      return `Another rate already starts on ${problem.validFrom}. Two rates cannot claim the same day.`;
    case 'negative-cost':
      return `An hourly cost cannot be negative (got ${problem.hourlyCost}).`;
    case 'unknown-record':
      return `Rate record ${problem.rateRecordId} no longer exists.`;
  }
}

function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }

  return a > b ? 1 : 0;
}
