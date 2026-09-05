import { type DisplayUnit } from '@repo/shared-common';
interface Props {
    readonly unit: DisplayUnit;
    readonly pricingAvailable: boolean;
    readonly onChange: (unit: DisplayUnit) => void;
}
/**
 * The four units of R2. Switching is a pure display change: nothing is written, so switching away
 * and back cannot alter the stored value.
 *
 * Hours and cost are disabled when People is unavailable, rather than shown empty — the planner is
 * told why the number is missing before they go looking for it.
 */
export declare function UnitSwitcher({ unit, pricingAvailable, onChange }: Props): import("react").JSX.Element;
export {};
