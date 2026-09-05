import type { PeopleContract } from '@repo/people-contracts';
import type { DisplayCurrency, PlatformHost } from '@repo/platform';
import { toMonthKey, type Employee } from '@repo/shared-common';

import { formatMoney, formatMonth, formatNumber } from '../../utils/format.utils';
import { UtilisationPanel } from '../capacity/utilisation-panel';
import type { PeopleStore } from './people-store';
import { RateHistoryEditor } from './rate-history-editor';

interface Props {
  readonly host: PlatformHost;
  readonly store: PeopleStore;
  readonly contract: PeopleContract;
  readonly employee: Employee;
  readonly currency: DisplayCurrency;
  readonly deliveryRevision: number;
}

/** One person: who they are, what they cost over time, and how loaded they already are. */
export function EmployeeDetail({
  host,
  store,
  contract,
  employee,
  currency,
  deliveryRevision,
}: Props) {
  // The month the reference calculation is about, and the one that shows a mid-month split.
  const sampleMonth = toMonthKey('2026-03');
  const quote = contract.quoteMonth(employee.id, sampleMonth);
  const personMonth = contract.personMonthHours(employee.id, sampleMonth);

  return (
    <div className="people-detail">
      <header className="people-detail__header">
        <div>
          <h2>{employee.name}</h2>
          <p className="people-sub">
            {employee.role} · {employee.weeklyHours} h contracted per week
          </p>
        </div>
        <code className="people-id">{employee.id}</code>
      </header>

      <section className="people-card">
        <h3>What this person&rsquo;s month is worth</h3>
        <dl className="people-facts">
          <div>
            <dt>Month</dt>
            <dd>{formatMonth(sampleMonth)}</dd>
          </div>
          <div>
            <dt>Working days</dt>
            <dd>{quote.workingDays}</dd>
          </div>
          <div>
            <dt>One person-month</dt>
            <dd>{formatNumber(personMonth, 2)} h</dd>
          </div>
          <div>
            <dt>Blended rate</dt>
            <dd>
              {formatMoney(quote.blendedRate, currency, 4)}/h
              {quote.segments.length > 1 ? (
                <span className="people-sub">
                  {quote.segments.map((segment) => segment.workingDays).join(' + ')} working days
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        <p className="people-hint">
          This is exactly what Delivery is given for this person and month — a price, never a rate
          record. Effort spreads evenly across working days, so a month costs hours × blended rate
          however many times the rate changed inside it.
          {quote.unpricedWorkingDays > 0 ? (
            <>
              {' '}
              <strong>
                {quote.unpricedWorkingDays} of these working days precede this person&rsquo;s first
                rate and cost nothing.
              </strong>
            </>
          ) : null}
        </p>
      </section>

      <RateHistoryEditor store={store} employee={employee} currency={currency} />

      <UtilisationPanel host={host} employeeId={employee.id} revision={deliveryRevision} />
    </div>
  );
}
