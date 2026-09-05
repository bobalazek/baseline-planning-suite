import { workingDaysInMonth, type MonthKey, type WeeklyHours } from '@repo/shared-common';

/**
 * How many hours one person-month is for this person in this month (R2):
 *
 *     weeklyHours × workingDays(month) ÷ 5
 *
 * It varies by person and by month and is never a constant — 40 h/week is 176 h in March 2026 and
 * 168 h in April 2026. Delivery has to ask for this rather than assume a flat 160, which is why it
 * is on the published contract.
 */
export function personMonthHours(weeklyHours: WeeklyHours, month: MonthKey): number {
  return (weeklyHours * workingDaysInMonth(month)) / 5;
}

/** Hours carried by each working day of a month when `hours` are spread evenly across it (R1). */
export function hoursPerWorkingDay(hours: number, month: MonthKey): number {
  const workingDays = workingDaysInMonth(month);

  return workingDays === 0 ? 0 : hours / workingDays;
}
