import type { Unsubscribe } from '../registry/service-registry';

/**
 * Display currency and active user; both owned by the shell, both pushed into the remotes at
 * runtime (F2). Nothing is *stored* in a display currency: cost is computed in euro, the canonical
 * currency of the rate records, and converted once at the point of formatting.
 */
export interface DisplayCurrency {
  readonly code: string;
  readonly symbol: string;
  /** Units of this currency per euro. Comes from container configuration, not from a bundle. */
  readonly unitsPerEuro: number;
}

export const EURO: DisplayCurrency = Object.freeze({
  code: 'EUR',
  symbol: '€',
  unitsPerEuro: 1,
});

/** Whoever is planning right now. Recorded on every edit so R5 can name the guilty assignment. */
export interface Actor {
  readonly id: string;
  readonly name: string;
}

export interface Session {
  readonly currency: DisplayCurrency;
  readonly actor: Actor;
}

export interface SessionContract {
  current(): Session;
  subscribe(listener: (session: Session) => void): Unsubscribe;
}

export interface MutableSessionContract extends SessionContract {
  set(session: Session): void;
}

export function createSession(initial: Session): MutableSessionContract {
  let session = initial;
  const listeners = new Set<(next: Session) => void>();

  return {
    current: () => session,

    set(next) {
      session = next;

      for (const listener of [...listeners]) {
        listener(session);
      }
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
