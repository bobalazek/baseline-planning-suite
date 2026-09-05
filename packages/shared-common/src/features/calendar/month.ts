/**
 * A calendar month, `YYYY-MM`. The unit every allocation is keyed by.
 *
 * All arithmetic here is integer arithmetic on year/month/day triples. Nothing in this module
 * constructs a `Date` from a local-time string, so nothing here can be shifted by the host's
 * timezone, a planning grid that moves a rate change by a day depending on where the browser
 * happens to be is the classic version of this bug.
 */
export type MonthKey = string & { readonly __brand: 'MonthKey' };

/** A calendar date, `YYYY-MM-DD`. Rate records are effective-dated with these. */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

export interface YearMonth {
  readonly year: number;
  readonly month: number; // 1-12
}

export interface YearMonthDay extends YearMonth {
  readonly day: number; // 1-31
}

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const { year, month, day } = parseIsoDate(value as IsoDate);

  return day <= daysInMonth({ year, month });
}

/** Narrows a string to `MonthKey`, throwing on anything that is not `YYYY-MM`. */
export function toMonthKey(value: string): MonthKey {
  if (!isMonthKey(value)) {
    throw new TypeError(`Not a YYYY-MM month key: ${JSON.stringify(value)}`);
  }

  return value;
}

/** Narrows a string to `IsoDate`, throwing on anything that is not a real `YYYY-MM-DD`. */
export function toIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new TypeError(`Not a YYYY-MM-DD date: ${JSON.stringify(value)}`);
  }

  return value;
}

export function parseMonthKey(month: MonthKey): YearMonth {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

export function parseIsoDate(date: IsoDate): YearMonthDay {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function formatMonthKey({ year, month }: YearMonth): MonthKey {
  return `${padNumber(year, 4)}-${padNumber(month, 2)}` as MonthKey;
}

export function formatIsoDate({ year, month, day }: YearMonthDay): IsoDate {
  return `${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)}` as IsoDate;
}

/** The month a date falls in. */
export function monthOf(date: IsoDate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth({ year, month }: YearMonth): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }

  return MONTH_LENGTHS[month - 1] ?? 0;
}

/** Negative when `a` is earlier, positive when later, zero when equal. */
export function compareMonths(a: MonthKey, b: MonthKey): number {
  if (a < b) {
    return -1;
  }

  return a > b ? 1 : 0;
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const { year, month: monthNumber } = parseMonthKey(month);
  const zeroBased = year * 12 + (monthNumber - 1) + delta;

  return formatMonthKey({ year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 });
}

/** Inclusive range of months, ascending. Empty when `to` precedes `from`. */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];

  for (let cursor = from; compareMonths(cursor, to) <= 0; cursor = addMonths(cursor, 1)) {
    months.push(cursor);
  }

  return months;
}

function padNumber(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
