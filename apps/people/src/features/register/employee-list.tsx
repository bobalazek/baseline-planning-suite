import { DELIVERY_CONTRACT } from '@repo/delivery-contracts';
import type { PlatformHost } from '@repo/platform';
import type { Employee, EmployeeId } from '@repo/shared-common';

import { useContract } from '../../hooks/use-platform';

interface Props {
  readonly host: PlatformHost;
  readonly employees: readonly Employee[];
  readonly selectedId: EmployeeId | null;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly onSelect: (employeeId: EmployeeId) => void;
  readonly deliveryRevision: number;
}

/** The searchable register (F3), with the over-capacity flag R5 asks People to show (F8). */
export function EmployeeList({
  host,
  employees,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  deliveryRevision,
}: Props) {
  const delivery = useContract(host, DELIVERY_CONTRACT);

  void deliveryRevision;

  const oversubscribed = new Set(delivery?.oversubscribedEmployeeIds() ?? []);

  return (
    <aside className="people-sidebar">
      <label className="people-search">
        <span className="people-visually-hidden">Search the register</span>
        <input
          type="search"
          placeholder="Search by name or role"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <p className="people-hint">
        {employees.length} {employees.length === 1 ? 'person' : 'people'}
        {delivery ? null : ' · utilisation unavailable'}
      </p>

      <ul className="people-listing">
        {employees.map((employee) => (
          <li key={employee.id}>
            <button
              type="button"
              className="people-listing__item"
              aria-current={employee.id === selectedId ? 'true' : undefined}
              onClick={() => onSelect(employee.id)}
            >
              <span className="people-listing__name">
                {employee.name}
                {oversubscribed.has(employee.id) ? (
                  <span className="people-dot" title="Over capacity in at least one month" />
                ) : null}
              </span>
              <span className="people-listing__meta">
                {employee.role} · {employee.weeklyHours} h/week
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
