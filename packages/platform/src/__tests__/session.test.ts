import { describe, expect, it, vi } from 'vitest';

import { createPlatformHost, createSession, EURO } from '../index';

const ACTOR = { id: 'usr-1', name: 'Planner' };

describe('createSession', () => {
  it('reports what the shell set, and tells subscribers on change', () => {
    const session = createSession({ currency: EURO, actor: ACTOR });
    const listener = vi.fn();

    session.subscribe(listener);

    const usd = { code: 'USD', symbol: '$', unitsPerEuro: 1.08 };

    session.set({ currency: usd, actor: ACTOR });

    expect(session.current().currency).toBe(usd);
    expect(listener).toHaveBeenCalledWith({ currency: usd, actor: ACTOR });
  });

  it('stops notifying after unsubscribe', () => {
    const session = createSession({ currency: EURO, actor: ACTOR });
    const listener = vi.fn();

    session.subscribe(listener)();
    session.set({ currency: EURO, actor: { id: 'usr-2', name: 'Other' } });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createPlatformHost', () => {
  it('builds an independent host per call — nothing here is a module singleton', () => {
    const first = createPlatformHost();
    const second = createPlatformHost();

    expect(first.registry).not.toBe(second.registry);
    expect(first.bus).not.toBe(second.bus);
  });

  it('defaults to euro and an anonymous actor', () => {
    expect(createPlatformHost().session.current().currency.code).toBe('EUR');
  });
});
