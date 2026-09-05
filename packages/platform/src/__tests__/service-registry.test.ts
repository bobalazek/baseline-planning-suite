import { describe, expect, it, vi } from 'vitest';

import { createServiceRegistry, defineContract } from '../index';

interface Greeter {
  greet(): string;
}

const GREETER = defineContract<Greeter>('test/greeter', '1.0');

describe('createServiceRegistry', () => {
  it('returns undefined for a contract nobody provided — the isolation case (F9)', () => {
    expect(createServiceRegistry().get(GREETER)).toBeUndefined();
  });

  it('hands back the implementation that was provided', () => {
    const registry = createServiceRegistry();

    registry.provide(GREETER, { greet: () => 'hello' });

    expect(registry.get(GREETER)?.greet()).toBe('hello');
  });

  it('removes the implementation when the provider disposes', () => {
    const registry = createServiceRegistry();
    const dispose = registry.provide(GREETER, { greet: () => 'hello' });

    dispose();

    expect(registry.get(GREETER)).toBeUndefined();
    expect(registry.provided()).toEqual([]);
  });

  it('does not let a stale disposer remove a newer implementation', () => {
    const registry = createServiceRegistry();
    const disposeFirst = registry.provide(GREETER, { greet: () => 'first' });

    registry.provide(GREETER, { greet: () => 'second' });
    disposeFirst();

    expect(registry.get(GREETER)?.greet()).toBe('second');
  });

  it('resolves whenAvailable for a contract provided later', async () => {
    const registry = createServiceRegistry();
    const pending = registry.whenAvailable(GREETER);

    registry.provide(GREETER, { greet: () => 'eventually' });

    expect((await pending).greet()).toBe('eventually');
  });

  it('resolves whenAvailable immediately for a contract already provided', async () => {
    const registry = createServiceRegistry();

    registry.provide(GREETER, { greet: () => 'already' });

    expect((await registry.whenAvailable(GREETER)).greet()).toBe('already');
  });

  it('emits the current value to a new observer, then every change', () => {
    const registry = createServiceRegistry();
    const seen: (string | undefined)[] = [];

    registry.observe(GREETER, (implementation) => seen.push(implementation?.greet()));
    const dispose = registry.provide(GREETER, { greet: () => 'up' });
    dispose();

    expect(seen).toEqual([undefined, 'up', undefined]);
  });

  it('stops notifying an observer that unsubscribed', () => {
    const registry = createServiceRegistry();
    const listener = vi.fn();

    registry.observe(GREETER, listener)();
    registry.provide(GREETER, { greet: () => 'ignored' });

    expect(listener).toHaveBeenCalledTimes(1); // the initial undefined only
  });

  it('warns when a consumer reads a contract across a major version boundary', () => {
    const onMismatch = vi.fn();
    const registry = createServiceRegistry(onMismatch);

    registry.provide(defineContract<Greeter>('test/greeter', '2.0'), { greet: () => 'v2' });
    registry.get(GREETER);

    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onMismatch.mock.calls[0]?.[0]).toContain('test/greeter');
  });

  it('stays quiet across a minor version difference', () => {
    const onMismatch = vi.fn();
    const registry = createServiceRegistry(onMismatch);

    registry.provide(defineContract<Greeter>('test/greeter', '1.7'), { greet: () => 'v1.7' });
    registry.get(GREETER);

    expect(onMismatch).not.toHaveBeenCalled();
  });
});
