import type { DisplayCurrency } from '@repo/platform';
import { toIsoDate, type Employee, type IsoDate, type RateRecordId } from '@repo/shared-common';
import { useState } from 'react';

import { formatDate, formatMoney } from '../../utils/format.utils';
import type { PeopleStore } from './people-store';

interface Props {
  readonly store: PeopleStore;
  readonly employee: Employee;
  readonly currency: DisplayCurrency;
}

/**
 * Rate history: addable, correctable and removable, including retroactively (F4).
 *
 * A rate runs from its `validFrom` until the next one begins, so the end date is derived from the
 * neighbour rather than stored. That is why two records may not claim the same day, and why the
 * service refuses that with a message this form shows verbatim.
 */
export function RateHistoryEditor({ store, employee, currency }: Props) {
  const records = store.rateRecordsOf(employee.id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [draftCost, setDraftCost] = useState('');

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="people-card">
      <h3>Cost rate history</h3>

      <table className="people-table">
        <thead>
          <tr>
            <th>Effective from</th>
            <th className="people-num">Hourly cost (€)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={3} className="people-hint">
                No rate on record. Work in any month costs zero until one starts, and those cells
                are marked in Delivery.
              </td>
            </tr>
          ) : null}

          {records.map((record, index) => {
            const next = records[index + 1];

            return (
              <tr key={record.id}>
                <td className="people-period">
                  <input
                    type="date"
                    defaultValue={record.validFrom}
                    disabled={busy}
                    onBlur={(event) => {
                      const value = event.target.value;

                      if (value && value !== record.validFrom) {
                        void run(() =>
                          store.updateRateRecord(record.id, { validFrom: toIsoDate(value) })
                        );
                      }
                    }}
                  />
                  <span className="people-period__until">
                    {next ? `until ${formatDate(dayBefore(next.validFrom))}` : 'no end date'}
                  </span>
                </td>
                <td className="people-num">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={record.hourlyCost}
                    disabled={busy}
                    onBlur={(event) => {
                      const value = Number(event.target.value);

                      if (Number.isFinite(value) && value !== record.hourlyCost) {
                        void run(() => store.updateRateRecord(record.id, { hourlyCost: value }));
                      }
                    }}
                  />
                  {currency.code === 'EUR' ? null : (
                    <span className="people-sub">
                      ≈ {formatMoney(record.hourlyCost, currency)}/h
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="people-button people-button--danger"
                    disabled={busy}
                    onClick={() =>
                      void run(() => store.deleteRateRecord(record.id as RateRecordId))
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form
        className="people-newrate"
        onSubmit={(event) => {
          event.preventDefault();

          const cost = Number(draftCost);

          if (!draftDate || !Number.isFinite(cost)) {
            setError('A new rate needs a start date and an hourly cost.');

            return;
          }

          void run(async () => {
            await store.createRateRecord({
              employeeId: employee.id,
              validFrom: toIsoDate(draftDate),
              hourlyCost: cost,
            });
            setDraftDate('');
            setDraftCost('');
          });
        }}
      >
        <label className="people-field">
          <span>Effective from</span>
          <input
            type="date"
            value={draftDate}
            onChange={(event) => setDraftDate(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="people-field">
          <span>Hourly cost (€)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draftCost}
            onChange={(event) => setDraftCost(event.target.value)}
            disabled={busy}
          />
        </label>
        <button type="submit" className="people-button" disabled={busy}>
          Add rate
        </button>
      </form>

      {error ? (
        <p className="people-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="people-hint">
        A rate applies from its start date, inclusive, until the next one begins, so the end shown
        under each date is derived rather than stored: there is no second field that could disagree
        with the next record. To move it, change the next row&rsquo;s start date. Rates are held in
        euro; editing the past is allowed and reprices every affected month in Delivery immediately.
      </p>
    </section>
  );
}

function dayBefore(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  const previous = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) - 1));

  return previous.toISOString().slice(0, 10);
}
