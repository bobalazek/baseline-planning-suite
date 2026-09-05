import type { Actor, DisplayCurrency, MutableSessionContract } from '@repo/platform';
import { useSyncExternalStore } from 'react';

interface Props {
  readonly session: MutableSessionContract;
  readonly currencies: readonly DisplayCurrency[];
  readonly actors: readonly Actor[];
}

/**
 * The shell owns display currency and the active user, and pushes both into the remotes (F2).
 *
 * Neither is stored anywhere: cost is computed in euro, the currency of the rate records, and
 * converted at the point of formatting. The active user is stamped on every edit, which is what
 * lets Delivery name the assignment behind an over-capacity month (R5).
 */
export function SessionControls({ session, currencies, actors }: Props) {
  const current = useSyncExternalStore(session.subscribe, session.current, session.current);

  return (
    <div className="shell-session">
      <label className="shell-field">
        <span>Display currency</span>
        <select
          value={current.currency.code}
          onChange={(event) => {
            const next = currencies.find((currency) => currency.code === event.target.value);

            if (next) {
              session.set({ ...current, currency: next });
            }
          }}
        >
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code}
            </option>
          ))}
        </select>
      </label>

      <label className="shell-field">
        <span>Active user</span>
        <select
          value={current.actor.id}
          onChange={(event) => {
            const next = actors.find((actor) => actor.id === event.target.value);

            if (next) {
              session.set({ ...current, actor: next });
            }
          }}
        >
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
