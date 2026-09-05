import { buildBreakdownTree, flatten } from '@repo/delivery-domain';
import { monthOf, monthsBetween, splitMonthAt, type EmployeeId } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { loadSeed } from '../fixtures/load-seed';
import { projectHorizon } from '../fixtures/project-horizon';

/**
 * The brief states the fixture's counts and shape. If the file we ship stops matching them, every
 * other assertion in this app is measuring something else.
 */
describe('fixtures/baseline-seed.json', () => {
  const seed = loadSeed();

  it('holds 60 employees with contracted hours of 40, 32 or 20', () => {
    expect(seed.employees).toHaveLength(60);
    expect(new Set(seed.employees.map((employee) => employee.weeklyHours))).toEqual(
      new Set([40, 32, 20])
    );
  });

  it('holds 150 rate records, one to four per person', () => {
    expect(seed.rateRecords).toHaveLength(150);

    const perEmployee = new Map<EmployeeId, number>();

    for (const record of seed.rateRecords) {
      perEmployee.set(record.employeeId, (perEmployee.get(record.employeeId) ?? 0) + 1);
    }

    expect(Math.min(...perEmployee.values())).toBe(1);
    expect(Math.max(...perEmployee.values())).toBe(4);
  });

  it('has 10 rate records that change mid-month — the case R1 exists for', () => {
    const midMonth = seed.rateRecords.filter((record) => {
      const month = monthOf(record.validFrom);
      const { before } = splitMonthAt(month, record.validFrom);

      return before > 0;
    });

    expect(midMonth).toHaveLength(10);
    expect(midMonth.map((record) => record.id)).toContain('rate-002');
  });

  it('holds 4 overlapping projects', () => {
    expect(seed.projects).toHaveLength(4);

    const overlapping = seed.projects.filter((project) =>
      seed.projects.some(
        (other) =>
          other.id !== project.id &&
          other.startDate <= project.endDate &&
          project.startDate <= other.endDate
      )
    );

    expect(overlapping).toHaveLength(4);
  });

  it('holds 90 breakdown items, exactly three levels deep', () => {
    expect(seed.breakdownItems).toHaveLength(90);

    const depths = seed.projects.flatMap((project) =>
      flatten(buildBreakdownTree(seed.breakdownItems, project.id)).map((node) => node.depth)
    );

    expect(depths).toHaveLength(90);
    expect(new Set(depths)).toEqual(new Set([0, 1, 2]));
  });

  it('carries allocations only on leaves — a parent is derived, never stored (R4)', () => {
    const parentIds = new Set(
      seed.breakdownItems.map((entry) => entry.parentId).filter((id) => id !== null)
    );

    for (const allocation of seed.allocations) {
      expect(parentIds.has(allocation.breakdownItemId)).toBe(false);
    }
  });

  it('holds 720 allocations, every one inside its own project"s horizon', () => {
    expect(seed.allocations).toHaveLength(720);

    const projectByItem = new Map(seed.breakdownItems.map((item) => [item.id, item.projectId]));
    const horizonByProject = new Map(
      seed.projects.map((project) => [project.id, new Set(projectHorizon(project))])
    );

    for (const allocation of seed.allocations) {
      const projectId = projectByItem.get(allocation.breakdownItemId);
      const horizon = projectId ? horizonByProject.get(projectId) : undefined;

      expect(horizon?.has(allocation.month)).toBe(true);
    }
  });

  it('spans a twelve-month suite horizon, and the reference cell sits just before it', () => {
    expect(
      monthsBetween(seed.gridHorizon.from as never, seed.gridHorizon.to as never)
    ).toHaveLength(12);

    // alloc-001 is March 2026, outside meta.gridHorizon, inside prj-1's own span. The grid is
    // driven by the project, which is the only way the reference calculation is reachable in the UI.
    const referenceCell = seed.allocations.find((allocation) => allocation.id === 'alloc-001');

    expect(referenceCell?.month).toBe('2026-03');
    expect(seed.gridHorizon.from).toBe('2026-04');
  });

  it('references only ids that exist', () => {
    const employeeIds = new Set(seed.employees.map((employee) => employee.id));
    const itemIds = new Set(seed.breakdownItems.map((item) => item.id));
    const projectIds = new Set(seed.projects.map((project) => project.id));

    for (const record of seed.rateRecords) {
      expect(employeeIds.has(record.employeeId)).toBe(true);
    }

    for (const item of seed.breakdownItems) {
      expect(projectIds.has(item.projectId)).toBe(true);

      if (item.parentId) {
        expect(itemIds.has(item.parentId)).toBe(true);
      }
    }

    for (const allocation of seed.allocations) {
      expect(employeeIds.has(allocation.employeeId)).toBe(true);
      expect(itemIds.has(allocation.breakdownItemId)).toBe(true);
    }
  });
});
