import { describe, expect, it, vi } from 'vitest';

import { createEventBus, defineEvent } from '../index';

const CHANGED = defineEvent<{ ids: string[] }>('test/changed');
const OTHER = defineEvent<{ ids: string[] }>('test/other');

describe('createEventBus', () => {
  it('delivers a payload to every subscriber of that channel only', () => {
    const bus = createEventBus();
    const onChanged = vi.fn();
    const onOther = vi.fn();

    bus.subscribe(CHANGED, onChanged);
    bus.subscribe(OTHER, onOther);
    bus.publish(CHANGED, { ids: ['emp-001'] });

    expect(onChanged).toHaveBeenCalledWith({ ids: ['emp-001'] });
    expect(onOther).not.toHaveBeenCalled();
  });

  it('is a no-op when nobody is listening', () => {
    expect(() => createEventBus().publish(CHANGED, { ids: [] })).not.toThrow();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.subscribe(CHANGED, handler)();
    bus.publish(CHANGED, { ids: [] });

    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps notifying the other subscribers when one throws', () => {
    const onError = vi.fn();
    const bus = createEventBus(onError);
    const survivor = vi.fn();

    bus.subscribe(CHANGED, () => {
      throw new Error('bad subscriber');
    });
    bus.subscribe(CHANGED, survivor);
    bus.publish(CHANGED, { ids: [] });

    expect(survivor).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('lets a handler unsubscribe itself mid-publish without skipping the next one', () => {
    const bus = createEventBus();
    const second = vi.fn();
    const unsubscribe = bus.subscribe(CHANGED, () => unsubscribe());

    bus.subscribe(CHANGED, second);
    bus.publish(CHANGED, { ids: [] });

    expect(second).toHaveBeenCalledTimes(1);
  });
});
