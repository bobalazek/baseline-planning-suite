import type { DisplayCurrency } from '@repo/platform';
/**
 * Cost is computed in euro — the currency the rate records are in — and converted once, here, at
 * the point of display. Nothing is ever stored in a display currency.
 */
export declare function formatMoney(amountInEuro: number, currency: DisplayCurrency, decimals?: number): string;
export declare function formatNumber(value: number, decimals: number): string;
export declare function formatMonth(month: string): string;
