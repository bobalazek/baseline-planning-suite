import type { DisplayCurrency } from '@repo/platform';
import { roundTo } from '@repo/shared-common';

/**
 * Cost is computed in euro, the currency the rate records are in, and converted once, here, at
 * the point of display. Nothing is ever stored in a display currency.
 */
export function formatMoney(amountInEuro: number, currency: DisplayCurrency, decimals = 2): string {
  const converted = amountInEuro * currency.unitsPerEuro;

  return `${currency.symbol}${roundTo(converted, decimals).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(value: number, decimals: number): string {
  return roundTo(value, decimals).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2026-03-11` becomes `11 Mar 2026`. Deliberately not the browser locale: this column sits beside
 * a native date input, and two different renderings of the same kind of value invite the reader to
 * treat the derived one as a second input. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');

  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
}

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return `${names[Number(monthNumber) - 1] ?? month} ${year?.slice(2) ?? ''}`;
}
