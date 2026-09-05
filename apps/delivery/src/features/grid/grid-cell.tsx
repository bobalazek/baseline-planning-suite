import type { GridCell as GridCellModel } from '@repo/delivery-domain';
import { useEffect, useRef, useState } from 'react';

interface Props {
  readonly cell: GridCellModel;
  readonly decimals: number;
  /** Already converted into the unit and currency on screen. `null` when it cannot be computed. */
  readonly value: number | null;
  readonly overCapacityNote: string | null;
  readonly onCommit: (entered: number) => void;
}

/**
 * One cell of the staffing grid.
 *
 * Only leaf cells are editable, a parent's effort comes from its children (R4). An edit is
 * committed on blur or Enter and abandoned on Escape, and the input starts from the *displayed*
 * value, so what the planner sees is what they are correcting.
 *
 * A cell can be flagged for two independent reasons, and the difference matters: `†` means the
 * person is over capacity once every project is counted (R5, never blocked, only flagged), and `·`
 * means part of the month precedes their first rate and costs nothing (R1).
 */
export function GridCell({ cell, decimals, value, overCapacityNote, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  const classes = ['grid-cell'];

  if (!cell.editable) {
    classes.push('grid-cell--derived');
  }

  if (cell.overCapacity) {
    classes.push('grid-cell--over');
  }

  if (cell.unpriced) {
    classes.push('grid-cell--unpriced');
  }

  if (value === null) {
    return (
      <td className={`${classes.join(' ')} grid-cell--unknown`} title="Pricing is unavailable">
        ,{' '}
      </td>
    );
  }

  if (!cell.editable) {
    return (
      <td className={classes.join(' ')} title={overCapacityNote ?? undefined}>
        {format(value, decimals)}
        {cell.overCapacity ? <span className="grid-mark">†</span> : null}
      </td>
    );
  }

  if (editing) {
    return (
      <td className={classes.join(' ')}>
        <input
          ref={inputRef}
          className="grid-input"
          type="number"
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            setEditing(false);

            const entered = Number(draft);

            if (draft.trim() !== '' && Number.isFinite(entered) && entered !== value) {
              onCommit(entered);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }

            if (event.key === 'Escape') {
              setDraft(String(value));
              setEditing(false);
            }
          }}
        />
      </td>
    );
  }

  return (
    <td className={classes.join(' ')} title={buildTitle(cell, overCapacityNote)}>
      <button
        type="button"
        className="grid-cell__button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
      >
        {format(value, decimals)}
        {cell.overCapacity ? <span className="grid-mark">†</span> : null}
        {cell.unpriced ? <span className="grid-mark grid-mark--unpriced">·</span> : null}
      </button>
    </td>
  );
}

function format(value: number, decimals: number): string {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function buildTitle(cell: GridCellModel, overCapacityNote: string | null): string | undefined {
  const notes: string[] = [];

  if (overCapacityNote) {
    notes.push(overCapacityNote);
  }

  if (cell.unpriced) {
    notes.push('Part of this month precedes the first rate on record and costs nothing.');
  }

  if (cell.splitAcrossRates) {
    notes.push('The rate changes inside this month; it is priced at the blended rate.');
  }

  return notes.length > 0 ? notes.join('\n') : undefined;
}
