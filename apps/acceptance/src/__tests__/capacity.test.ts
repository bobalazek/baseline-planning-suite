import {
  buildBreakdownTree,
  buildGrid,
  buildUtilisationIndex,
  culpritFor,
  oversubscribedEmployeeIds,
  utilisationAt,
} from '@repo/delivery-domain';
import { toMonthKey, type EmployeeId, type ProjectId } from '@repo/shared-common';
import { describe, expect, it } from 'vitest';

import { composeSuite } from '../fixtures/compose-suite';
import { projectHorizon } from '../fixtures/project-horizon';

/**
 * R5 over the shipped fixture. The brief's own Figure 5 names the case: "M. Brandt is over capacity
 * in Jun 26 once his other projects are counted." He is emp-003, and he is — but only when the sum
 * crosses project boundaries.
 */
describe('Capacity is cross-project (R5)', () => {
  const suite = composeSuite();
  const index = buildUtilisationIndex(suite.seed.allocations, suite.seed.breakdownItems);

  const BRANDT = 'emp-003' as EmployeeId;
  const JUNE_2026 = toMonthKey('2026-06');

  it('finds M. Brandt over capacity in Jun 26, exactly as the brief says', () => {
    expect(suite.employeeById.get(BRANDT)?.name).toBe('Milan Brandt');

    const june = utilisationAt(index, BRANDT, JUNE_2026);

    expect(june?.personMonths).toBeCloseTo(1.18, 10);
    expect(june?.overCapacityBy).toBeCloseTo(0.18, 10);
    expect(june?.projectCount).toBe(2);
  });

  it('would miss it entirely if only one project were counted', () => {
    const singleProject = suite.seed.breakdownItems.filter(
      (item) => item.projectId === ('prj-1' as ProjectId)
    );
    const itemIds = new Set(singleProject.map((item) => item.id));

    const narrow = buildUtilisationIndex(
      suite.seed.allocations.filter((allocation) => itemIds.has(allocation.breakdownItemId)),
      singleProject
    );

    expect(utilisationAt(narrow, BRANDT, JUNE_2026)?.overCapacityBy).toBe(0);
  });

  it('finds six oversubscribed person-months across the fixture, all spanning two projects', () => {
    const oversubscribed = oversubscribedEmployeeIds(index);

    expect(oversubscribed).toHaveLength(6);
    expect(oversubscribed).toContain(BRANDT);

    for (const employeeId of oversubscribed) {
      const overMonths = [...(index.byEmployee.get(employeeId)?.values() ?? [])].filter(
        (entry) => entry.overCapacityBy > 0
      );

      for (const entry of overMonths) {
        expect(entry.projectCount).toBeGreaterThan(1);
      }
    }
  });

  it('never reports anybody at exactly 100% as over capacity', () => {
    for (const months of index.byEmployee.values()) {
      for (const entry of months.values()) {
        expect(entry.overCapacityBy > 0).toBe(entry.personMonths > 1);
      }
    }
  });

  it('names an assignment for every oversubscribed person-month', () => {
    for (const employeeId of oversubscribedEmployeeIds(index)) {
      for (const entry of index.byEmployee.get(employeeId)?.values() ?? []) {
        if (entry.overCapacityBy > 0) {
          expect(culpritFor(index, employeeId, entry.month)).toBeDefined();
        }
      }
    }
  });

  it('flags the overrun in the Delivery grid, in the project the planner has open', () => {
    const project = suite.seed.projects.find(
      (candidate) => candidate.id === ('prj-1' as ProjectId)
    );

    const grid = buildGrid({
      tree: buildBreakdownTree(suite.seed.breakdownItems, project!.id),
      months: projectHorizon(project!),
      allocations: suite.seed.allocations,
      unit: 'personMonths',
      utilisation: index,
      employeeName: (employeeId) => suite.employeeById.get(employeeId)?.name ?? employeeId,
      pricing: suite.pricing,
    });

    const juneIndex = projectHorizon(project!).indexOf(JUNE_2026);
    const brandtRows = grid.rows.filter(
      (row) => row.kind === 'assignment' && row.employeeId === BRANDT
    );

    expect(brandtRows.length).toBeGreaterThan(0);
    expect(brandtRows.some((row) => row.cells[juneIndex]?.overCapacity)).toBe(true);
  });
});
