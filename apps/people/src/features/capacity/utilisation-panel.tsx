import { DELIVERY_CONTRACT } from '@repo/delivery-contracts';
import type { PlatformHost } from '@repo/platform';
import { CAPACITY_PERSON_MONTHS, type EmployeeId } from '@repo/shared-common';

import { useContract } from '../../hooks/use-platform';
import { formatMonth, formatNumber } from '../../utils/format.utils';

interface Props {
  readonly host: PlatformHost;
  readonly employeeId: EmployeeId;
  /** Bumped when Delivery says allocations moved, so this re-reads through the contract. */
  readonly revision: number;
}

/**
 * R5 from People's side: is this person committed beyond their contracted hours?
 *
 * The numbers come from Delivery's published contract and are summed across **every** project,
 * including ones this planner cannot see. People does not hold allocations and never will; if
 * Delivery is not loaded, this panel says so rather than implying the person is free.
 */
export function UtilisationPanel({ host, employeeId, revision }: Props) {
  const delivery = useContract(host, DELIVERY_CONTRACT);

  if (!delivery) {
    return (
      <section className="people-card people-card--muted">
        <h3>Utilisation</h3>
        <p className="people-hint">
          Delivery is not available, so how loaded this person is cannot be shown. The register and
          rate history above are unaffected.
        </p>
      </section>
    );
  }

  // `revision` is read so this recomputes when Delivery publishes a change.
  void revision;

  const months = delivery.utilisationFor(employeeId);
  const over = months.filter((month) => month.overCapacityBy > 0);

  return (
    <section className="people-card">
      <h3>
        Utilisation
        {over.length > 0 ? <span className="people-flag">Oversubscribed</span> : null}
      </h3>

      {months.length === 0 ? (
        <p className="people-hint">Not assigned to any work in the plan.</p>
      ) : (
        <table className="people-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="people-num">Allocated</th>
              <th className="people-num">Over by</th>
              <th className="people-num">Projects</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month} className={month.overCapacityBy > 0 ? 'people-row--over' : ''}>
                <td>{formatMonth(month.month)}</td>
                <td className="people-num">
                  {formatNumber(month.personMonths, 2)} PM
                  <span className="people-sub">
                    {formatNumber((month.personMonths / CAPACITY_PERSON_MONTHS) * 100, 1)}%
                  </span>
                </td>
                <td className="people-num">
                  {month.overCapacityBy > 0 ? formatNumber(month.overCapacityBy, 2) : '—'}
                </td>
                <td className="people-num">{month.projectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="people-hint">
        Capacity is one person-month, summed across every project. Delivery names the assignment
        behind an overrun.
      </p>
    </section>
  );
}
