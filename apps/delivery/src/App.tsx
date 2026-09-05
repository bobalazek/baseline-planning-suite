import {
  buildBreakdownTree,
  buildGrid,
  buildUtilisationIndex,
  culpritFor,
  flatten,
  fromDisplayValue,
  isLeaf as isLeafNode,
  utilisationAt,
  walk,
  type GridRow,
} from '@repo/delivery-domain';
import { PEOPLE_CONTRACT } from '@repo/people-contracts';
import type { RemoteAppProps } from '@repo/platform';
import {
  monthOf,
  monthsBetween,
  type BreakdownItemId,
  type DisplayUnit,
  type EmployeeId,
  type MonthKey,
  type ProjectId,
} from '@repo/shared-common';
import { useMemo, useState } from 'react';

import { runtimeFor } from './bootstrap';
import { CapacityWarnings } from './features/capacity/capacity-warnings';
import { StaffingGrid } from './features/grid/staffing-grid';
import { UnitSwitcher } from './features/grid/unit-switcher';
import { ProjectPicker } from './features/plan/project-picker';
import { usePricing } from './features/pricing/use-pricing';
import { useContract, useDeliverySnapshot, useSession } from './hooks/use-platform';
import { formatMonth, formatNumber } from './utils/format.utils';
import './styles.css';

/**
 * The Delivery application: a work breakdown and the staffing grid that spends People's rates.
 *
 * Everything numeric here is computed by `@repo/delivery-domain` and tested without a DOM. This
 * component chooses a project, wires the edit handlers, and paints the result.
 */
export default function App({ host }: RemoteAppProps) {
  const runtime = runtimeFor(host);
  const session = useSession(host);
  const pricing = usePricing(host, session.currency);
  const people = useContract(host, PEOPLE_CONTRACT);

  const [projectId, setProjectId] = useState<ProjectId | null>(null);
  const [unit, setUnit] = useState<DisplayUnit>('personMonths');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const store = runtime?.store ?? EMPTY_STORE;
  const plan = useDeliverySnapshot(store);

  const model = useMemo(() => {
    const projects = plan.projects;
    const project = projects.find((candidate) => candidate.id === projectId) ?? projects[0];

    if (!project) {
      return null;
    }

    // A project's horizon is its own start → end. The fixture puts every allocation inside it,
    // including the March 2026 cell the reference calculation is about.
    const months: MonthKey[] = monthsBetween(monthOf(project.startDate), monthOf(project.endDate));
    const tree = buildBreakdownTree(plan.breakdownItems, project.id);
    const utilisation = plan.utilisation;

    return {
      project,
      projects,
      months,
      tree,
      utilisation,
      grid: buildGrid({
        tree,
        months,
        allocations: plan.allocations,
        unit,
        utilisation,
        employeeName: pricing.employeeName,
        pricing: pricing.lookup,
      }),
      itemsById: new Map(plan.breakdownItems.map((item) => [item.id, item])),
      projectsById: new Map(projects.map((candidate) => [String(candidate.id), candidate])),
    };
  }, [plan, projectId, unit, pricing]);

  if (!runtime) {
    return (
      <div className="delivery-app delivery-app--failed" role="alert">
        <h2>Delivery was rendered without being registered</h2>
        <p>
          A host must call <code>register(host)</code> from <code>delivery/bootstrap</code> before
          rendering <code>delivery/App</code> with the same host.
        </p>
      </div>
    );
  }

  if (!model) {
    return <div className="delivery-app delivery-empty">Loading the plan…</div>;
  }

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const actions = {
    busy,

    onEditCell(row: GridRow, month: MonthKey, entered: number) {
      if (row.kind !== 'assignment') {
        return;
      }

      const personMonths = fromDisplayValue(entered, unit, pricing.lookup(row.employeeId, month));

      if (personMonths === null) {
        setError(
          'This month has no rate on record, so an amount in money cannot be turned back into effort. Switch to person-months, hours or % to edit it.'
        );

        return;
      }

      if (personMonths < 0) {
        setError('Effort cannot be negative.');

        return;
      }

      void run(() =>
        store.upsertAllocation({
          breakdownItemId: row.itemId,
          employeeId: row.employeeId,
          month,
          amount: personMonths,
          updatedBy: session.actor.id,
        })
      );
    },

    onAddChild(parentId: BreakdownItemId) {
      const name = window.prompt('Name of the new work package');

      if (name?.trim()) {
        void run(() =>
          store.createBreakdownItem({
            projectId: model.project.id,
            parentId,
            name: name.trim(),
          })
        );
      }
    },

    onRename(itemId: BreakdownItemId) {
      const current = model.itemsById.get(itemId)?.name ?? '';
      const name = window.prompt('Rename work package', current);

      if (name?.trim() && name.trim() !== current) {
        void run(() => store.updateBreakdownItem(itemId, { name: name.trim() }));
      }
    },

    onMove(itemId: BreakdownItemId, parentId: BreakdownItemId | null) {
      void run(() => store.updateBreakdownItem(itemId, { parentId }));
    },

    onDelete(itemId: BreakdownItemId) {
      const item = model.itemsById.get(itemId);

      if (window.confirm(`Delete "${item?.name}" and everything beneath it?`)) {
        void run(() => store.deleteBreakdownItem(itemId));
      }
    },

    onAssign(itemId: BreakdownItemId, employeeId: EmployeeId) {
      // Zero would clear the cell, so a new assignment starts at a nominal tenth of a month; the
      // planner types the real number into the grid.
      void run(() =>
        store.upsertAllocation({
          breakdownItemId: itemId,
          employeeId,
          month: model.months[0] as MonthKey,
          amount: 0.1,
          updatedBy: session.actor.id,
        })
      );
    },
  };

  const assignedTo = (itemId: BreakdownItemId): ReadonlySet<EmployeeId> =>
    new Set(
      plan.allocations
        .filter((allocation) => allocation.breakdownItemId === itemId)
        .map((allocation) => allocation.employeeId)
    );

  return (
    <div className="delivery-app">
      <header className="delivery-toolbar">
        <ProjectPicker
          projects={model.projects}
          selectedId={model.project.id}
          onSelect={setProjectId}
        />

        <UnitSwitcher unit={unit} pricingAvailable={pricing.available} onChange={setUnit} />

        <div className="delivery-toolbar__spacer" />

        <p className="delivery-hint delivery-hint--inline">
          {formatMonth(model.months[0] ?? '')} → {formatMonth(model.months.at(-1) ?? '')} ·{' '}
          {model.months.length} months
          {pricing.available ? null : ' · People unavailable, costs hidden'}
        </p>
      </header>

      {error ? (
        <p className="delivery-error" role="alert">
          {error}
        </p>
      ) : null}

      <StaffingGrid
        grid={model.grid}
        currency={session.currency}
        actions={actions}
        itemsById={model.itemsById}
        moveTargetsFor={(itemId) => {
          const node = model.tree.byId.get(itemId);
          const forbidden = new Set(node ? walk(node).map((entry) => entry.item.id) : [itemId]);

          return flatten(model.tree)
            .map((entry) => entry.item)
            .filter((candidate) => !forbidden.has(candidate.id));
        }}
        assignableFor={(itemId) => {
          const already = assignedTo(itemId);

          return (people?.listEmployees() ?? []).filter((employee) => !already.has(employee.id));
        }}
        isLeaf={(itemId) => {
          const node = model.tree.byId.get(itemId);

          return node ? isLeafNode(node) : false;
        }}
        overCapacityNote={(row, month) => {
          if (row.kind !== 'assignment') {
            return null;
          }

          const entry = utilisationAt(model.utilisation, row.employeeId, month);

          if (!entry || entry.overCapacityBy <= 0) {
            return null;
          }

          const culprit = culpritFor(model.utilisation, row.employeeId, month);
          const item = culprit ? model.itemsById.get(culprit.breakdownItemId) : undefined;

          return [
            `Over capacity: ${formatNumber(entry.personMonths, 2)} of 1.00 person-months, across ${entry.projectCount} projects.`,
            culprit
              ? `Most recently edited: ${item?.name ?? culprit.breakdownItemId} (${formatNumber(culprit.amount, 2)} PM, by ${culprit.updatedBy}).`
              : '',
          ]
            .filter(Boolean)
            .join('\n');
        }}
      />

      <CapacityWarnings
        grid={model.grid}
        utilisation={model.utilisation}
        itemsById={model.itemsById}
        projectsById={model.projectsById}
        employeeName={pricing.employeeName}
      />

      <footer className="delivery-legend">
        <span>
          <span className="grid-mark">†</span> over capacity once every project is counted
        </span>
        <span>
          <span className="grid-mark grid-mark--unpriced">·</span> part of the month precedes the
          first rate on record and costs nothing
        </span>
        <span>
          <em>derived</em> rows come from their children and cannot be edited
        </span>
      </footer>
    </div>
  );
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const details = 'details' in error ? (error as { details?: readonly string[] }).details : [];

    return [error.message, ...(details ?? [])].join(' ');
  }

  return String(error);
}

/**
 * Keeps the hook order stable on the one render where a host rendered `./App` without calling
 * `register` first. It is an empty plan, not a mock: nothing reads through it.
 */
const EMPTY_PLAN = {
  revision: 0,
  projects: [],
  breakdownItems: [],
  allocations: [],
  utilisation: buildUtilisationIndex([], []),
};

const EMPTY_STORE = {
  snapshot: () => EMPTY_PLAN,
  subscribe: () => () => undefined,
} as unknown as Parameters<typeof useDeliverySnapshot>[0];
