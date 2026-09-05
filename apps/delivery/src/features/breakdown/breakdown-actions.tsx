import type { BreakdownItem, BreakdownItemId } from '@repo/shared-common';

interface Props {
  readonly item: BreakdownItem;
  readonly moveTargets: readonly BreakdownItem[];
  readonly busy: boolean;
  readonly onAddChild: (parentId: BreakdownItemId) => void;
  readonly onRename: (itemId: BreakdownItemId) => void;
  readonly onMove: (itemId: BreakdownItemId, parentId: BreakdownItemId | null) => void;
  readonly onDelete: (itemId: BreakdownItemId) => void;
}

/**
 * Create, rename, move and delete on one work package (F5).
 *
 * Move is a select rather than drag-and-drop: the brief forbids a tree package, and a list of legal
 * parents is both easier to get right and reachable from a keyboard. Illegal targets — the item
 * itself and anything inside it — are filtered out before they can be chosen.
 */
export function BreakdownActions({
  item,
  moveTargets,
  busy,
  onAddChild,
  onRename,
  onMove,
  onDelete,
}: Props) {
  return (
    <span className="row-actions">
      <button
        type="button"
        className="row-action"
        disabled={busy}
        title="Add a work package beneath this one"
        onClick={() => onAddChild(item.id)}
      >
        + Child
      </button>
      <button
        type="button"
        className="row-action"
        disabled={busy}
        title="Rename"
        onClick={() => onRename(item.id)}
      >
        Rename
      </button>
      <select
        className="row-action row-action--select"
        value={item.parentId ?? ''}
        disabled={busy}
        title="Move under another work package"
        onChange={(event) => onMove(item.id, (event.target.value || null) as BreakdownItemId | null)}
      >
        <option value="">— top level —</option>
        {moveTargets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="row-action row-action--danger"
        disabled={busy}
        title="Delete this work package and everything under it"
        onClick={() => onDelete(item.id)}
      >
        Delete
      </button>
    </span>
  );
}
