import { DELIVERY_ALLOCATIONS_CHANGED } from '@repo/delivery-contracts';
import { searchEmployees } from '@repo/people-domain';
import type { RemoteAppProps } from '@repo/platform';
import type { EmployeeId } from '@repo/shared-common';
import { useState } from 'react';

import { runtimeFor } from './bootstrap';
import { EmployeeDetail } from './features/register/employee-detail';
import { EmployeeList } from './features/register/employee-list';
import { useEventRevision, usePeopleSnapshot, useSession } from './hooks/use-platform';
import './styles.css';

/**
 * The People application.
 *
 * It takes the host as a prop rather than reading a module-level singleton, so the host it renders
 * against is provably the one `register` published its contract to — hosted in the shell or
 * standalone on its own origin, with no branch anywhere in this file.
 */
export default function App({ host }: RemoteAppProps) {
  const runtime = runtimeFor(host);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<EmployeeId | null>(null);

  const session = useSession(host);
  const deliveryRevision = useEventRevision(host, DELIVERY_ALLOCATIONS_CHANGED);
  const register = usePeopleSnapshot(runtime?.store ?? EMPTY_STORE);

  if (!runtime) {
    return (
      <div className="people-app people-app--failed" role="alert">
        <h2>People was rendered without being registered</h2>
        <p>
          A host must call <code>register(host)</code> from <code>people/bootstrap</code> before
          rendering <code>people/App</code> with the same host.
        </p>
      </div>
    );
  }

  const employees = searchEmployees(register.employees, query);
  const selected = selectedId ? runtime.store.findEmployee(selectedId) : undefined;

  return (
    <div className="people-app">
      <EmployeeList
        host={host}
        employees={employees}
        selectedId={selectedId}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelectedId}
        deliveryRevision={deliveryRevision}
      />

      <main className="people-main">
        {selected ? (
          <EmployeeDetail
            host={host}
            store={runtime.store}
            contract={runtime.contract}
            employee={selected}
            currency={session.currency}
            deliveryRevision={deliveryRevision}
          />
        ) : (
          <div className="people-empty">
            <h2>The employee register</h2>
            <p>
              Roles, contracted hours and cost-rate history. Choose somebody to see what their month
              is worth and to correct their rates — including retroactively.
            </p>
            <p className="people-hint">
              People owns rates. Delivery is given a price per person per month, never a rate
              record, so a correction here reprices every open cost view without a reload.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Keeps the hook order stable on the one render where a host rendered `./App` without calling
 * `register` first. It is an empty register, not a mock: nothing reads through it.
 */
const EMPTY_REGISTER = { revision: 0, employees: [] };

const EMPTY_STORE = {
  snapshot: () => EMPTY_REGISTER,
  subscribe: () => () => undefined,
} as unknown as Parameters<typeof usePeopleSnapshot>[0];
