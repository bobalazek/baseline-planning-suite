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
export declare function BreakdownActions({ item, moveTargets, busy, onAddChild, onRename, onMove, onDelete, }: Props): import("react").JSX.Element;
export {};
