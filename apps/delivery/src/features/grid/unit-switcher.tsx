import { DISPLAY_UNITS, UNIT_LABELS, type DisplayUnit } from '@repo/shared-common';
import { unitNeedsPricing } from '@repo/delivery-domain';

interface Props {
  readonly unit: DisplayUnit;
  readonly pricingAvailable: boolean;
  readonly onChange: (unit: DisplayUnit) => void;
}

/**
 * The four units of R2. Switching is a pure display change: nothing is written, so switching away
 * and back cannot alter the stored value.
 *
 * Hours and cost are disabled when People is unavailable, rather than shown empty, the planner is
 * told why the number is missing before they go looking for it.
 */
export function UnitSwitcher({ unit, pricingAvailable, onChange }: Props) {
  return (
    <div className="unit-switcher" role="group" aria-label="Display unit">
      {DISPLAY_UNITS.map((candidate) => {
        const blocked = unitNeedsPricing(candidate) && !pricingAvailable;

        return (
          <button
            key={candidate}
            type="button"
            className="unit-switcher__option"
            aria-pressed={candidate === unit}
            disabled={blocked}
            title={blocked ? 'People is unavailable, so this unit cannot be computed' : undefined}
            onClick={() => onChange(candidate)}
          >
            {UNIT_LABELS[candidate]}
          </button>
        );
      })}
    </div>
  );
}
