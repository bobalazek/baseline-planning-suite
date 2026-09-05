import type { Unsubscribe } from '../registry/service-registry';

/**
 * A typed channel. Same phantom-type trick as `ContractKey`: the payload type travels with the
 * channel constant, so `bus.publish(RATES_CHANGED, { employeeIds })` type-checks against the
 * definition the publishing team owns, and no central union of event types has to exist.
 */
export interface EventChannel<TPayload> {
  readonly type: string;
  readonly __payload?: TPayload;
}

export function defineEvent<TPayload>(type: string): EventChannel<TPayload> {
  return Object.freeze({ type });
}

export interface EventBus {
  publish<TPayload>(channel: EventChannel<TPayload>, payload: TPayload): void;
  subscribe<TPayload>(
    channel: EventChannel<TPayload>,
    handler: (payload: TPayload) => void
  ): Unsubscribe;
}

type AnyHandler = (payload: never) => void;

export function createEventBus(onHandlerError?: (error: unknown) => void): EventBus {
  const handlersByType = new Map<string, Set<AnyHandler>>();

  return {
    publish(channel, payload) {
      const handlers = handlersByType.get(channel.type);

      if (!handlers) {
        return;
      }

      // Snapshot: a handler is allowed to unsubscribe itself, and one throwing handler must not
      // stop the rest from being told. Cross-app notification is the one place in this product
      // where a single bad subscriber could otherwise silently desynchronise both apps.
      for (const handler of [...handlers]) {
        try {
          (handler as (value: typeof payload) => void)(payload);
        } catch (error) {
          onHandlerError?.(error);
        }
      }
    },

    subscribe(channel, handler) {
      const handlers = handlersByType.get(channel.type) ?? new Set<AnyHandler>();

      handlers.add(handler as AnyHandler);
      handlersByType.set(channel.type, handlers);

      return () => {
        handlers.delete(handler as AnyHandler);

        if (handlers.size === 0) {
          handlersByType.delete(channel.type);
        }
      };
    },
  };
}
