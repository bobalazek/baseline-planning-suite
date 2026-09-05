import type { Employee, BreakdownItemId, EmployeeId } from '@repo/shared-common';
import { useState } from 'react';

interface Props {
  readonly itemId: BreakdownItemId;
  readonly candidates: readonly Employee[];
  readonly busy: boolean;
  readonly onAdd: (itemId: BreakdownItemId, employeeId: EmployeeId) => void;
}

/**
 * Put somebody on a leaf work package.
 *
 * The list of people comes from People's published contract, so this control disappears when People
 * is unavailable — Delivery has no register of its own and will not invent one.
 */
export function AddAssignment({ itemId, candidates, busy, onAdd }: Props) {
  const [employeeId, setEmployeeId] = useState('');

  if (candidates.length === 0) {
    return null;
  }

  return (
    <span className="row-actions">
      <select
        className="row-action row-action--select"
        value={employeeId}
        disabled={busy}
        onChange={(event) => {
          const value = event.target.value;

          setEmployeeId('');

          if (value) {
            onAdd(itemId, value as EmployeeId);
          }
        }}
      >
        <option value="">+ Assign someone…</option>
        {candidates.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name} · {employee.role}
          </option>
        ))}
      </select>
    </span>
  );
}
