import {
  compareMonths,
  daysInMonth,
  formatIsoDate,
  monthOf,
  parseIsoDate,
  parseMonthKey,
  type IsoDate,
  type MonthKey,
  type YearMonth,
} from './month';

/** Day of week for a date, 0 = Sunday. Sakamoto's method, integer arithmetic, no `Date`. */
export function dayOfWeek({ year, month, day }: YearMonth & { day: number }): number {
  const monthOffsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;
  const shiftedYear = month < 3 ? year - 1 : year;
  const offset = monthOffsets[month - 1] ?? 0;

  return (
    (shiftedYear +
      Math.floor(shiftedYear / 4) -
      Math.floor(shiftedYear / 100) +
      Math.floor(shiftedYear / 400) +
      offset +
      day) %
    7
  );
}

/** Working days are Monday to Friday. Public holidays are ignored entirely (R1). */
export function isWorkingDay(date: IsoDate): boolean {
  const weekday = dayOfWeek(parseIsoDate(date));

  return weekday >= 1 && weekday <= 5;
}

/** Total working days in a month. March 2026 → 22. */
export function workingDaysInMonth(month: MonthKey): number {
  const yearMonth = parseMonthKey(month);

  return countWorkingDays(yearMonth, 1, daysInMonth(yearMonth));
}

/**
 * Working days in a month between two days of the month, both inclusive. Days outside the month
 * are clamped; an inverted range is zero.
 */
export function workingDaysInDayRange(month: MonthKey, fromDay: number, toDay: number): number {
  const yearMonth = parseMonthKey(month);

  return countWorkingDays(yearMonth, Math.max(1, fromDay), Math.min(daysInMonth(yearMonth), toDay));
}

/**
 * Working days in a month strictly before a date, and from that date onward, the two halves R1
 * splits a month into at a rate change. `validFrom` is inclusive, so the boundary day itself lands
 * in `from`. A boundary outside the month puts every working day on one side, which is what makes
 * this safe to call for a rate that started years ago.
 */
export function splitMonthAt(
  month: MonthKey,
  boundary: IsoDate
): { readonly before: number; readonly from: number } {
  const total = workingDaysInMonth(month);
  const position = compareMonths(monthOf(boundary), month);

  if (position < 0) {
    return { before: 0, from: total };
  }

  if (position > 0) {
    return { before: total, from: 0 };
  }

  const before = workingDaysInDayRange(month, 1, parseIsoDate(boundary).day - 1);

  return { before, from: total - before };
}

/** Every working day of a month, ascending. Used by tests, and by nothing on a hot path. */
export function workingDaysOf(month: MonthKey): IsoDate[] {
  const yearMonth = parseMonthKey(month);
  const days: IsoDate[] = [];

  for (let day = 1; day <= daysInMonth(yearMonth); day += 1) {
    const date = formatIsoDate({ ...yearMonth, day });

    if (isWorkingDay(date)) {
      days.push(date);
    }
  }

  return days;
}

function countWorkingDays(yearMonth: YearMonth, fromDay: number, toDay: number): number {
  let count = 0;

  for (let day = fromDay; day <= toDay; day += 1) {
    const weekday = dayOfWeek({ ...yearMonth, day });

    if (weekday >= 1 && weekday <= 5) {
      count += 1;
    }
  }

  return count;
}
