import { monthOf, monthsBetween, type MonthKey, type Project } from '@repo/shared-common';

/**
 * A project's grid horizon is its own start → end, inclusive. The shipped fixture places every one
 * of its 720 allocations inside its project's span, and the reference cell (`alloc-001`, March
 * 2026) is only reachable this way: the suite-wide horizon in `meta.gridHorizon` starts in April.
 */
export function projectHorizon(project: Project): MonthKey[] {
  return monthsBetween(monthOf(project.startDate), monthOf(project.endDate));
}
