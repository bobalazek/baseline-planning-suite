import { majorVersionOf, type ContractKey } from './contract-key';

export type Unsubscribe = () => void;

/**
 * Where the two teams meet. One app *provides* a contract, the other *gets* it — and `get` returns
 * `undefined` rather than throwing, because "the other remote did not load" is a normal state of
 * this system, not an exception (F9). Every consumer is forced by the type to say what it renders
 * in that case.
 */
export interface ServiceRegistry {
  provide<TContract>(key: ContractKey<TContract>, implementation: TContract): Unsubscribe;
  get<TContract>(key: ContractKey<TContract>): TContract | undefined;
  /** Resolves when the contract is provided. Never rejects; callers race it against a timeout. */
  whenAvailable<TContract>(key: ContractKey<TContract>): Promise<TContract>;
  observe<TContract>(
    key: ContractKey<TContract>,
    listener: (implementation: TContract | undefined) => void
  ): Unsubscribe;
  /** Ids currently provided. The shell renders this on its status panel. */
  provided(): readonly string[];
}

interface RegistryEntry {
  readonly version: string;
  readonly implementation: unknown;
}

export function createServiceRegistry(
  onVersionMismatch?: (message: string) => void
): ServiceRegistry {
  const entries = new Map<string, RegistryEntry>();
  const listenersById = new Map<string, Set<(implementation: unknown) => void>>();

  const notify = (id: string, implementation: unknown): void => {
    for (const listener of listenersById.get(id) ?? []) {
      listener(implementation);
    }
  };

  const checkVersion = (key: ContractKey<unknown>, entry: RegistryEntry): void => {
    if (majorVersionOf(entry.version) !== majorVersionOf(key.version)) {
      onVersionMismatch?.(
        `Contract "${key.id}" was provided at v${entry.version} but is being consumed at ` +
          `v${key.version}. Majors differ — the consuming app was built against a different ` +
          `contract than the one that loaded.`
      );
    }
  };

  return {
    provide(key, implementation) {
      entries.set(key.id, { version: key.version, implementation });
      notify(key.id, implementation);

      return () => {
        if (entries.get(key.id)?.implementation === implementation) {
          entries.delete(key.id);
          notify(key.id, undefined);
        }
      };
    },

    get(key) {
      const entry = entries.get(key.id);

      if (!entry) {
        return undefined;
      }

      checkVersion(key, entry);

      return entry.implementation as typeof key.__contract;
    },

    whenAvailable(key) {
      const existing = entries.get(key.id);

      if (existing) {
        checkVersion(key, existing);

        return Promise.resolve(existing.implementation as NonNullable<typeof key.__contract>);
      }

      return new Promise((resolve) => {
        const listeners = listenersById.get(key.id) ?? new Set();

        const listener = (implementation: unknown): void => {
          if (implementation === undefined) {
            return;
          }

          listeners.delete(listener);
          resolve(implementation as NonNullable<typeof key.__contract>);
        };

        listeners.add(listener);
        listenersById.set(key.id, listeners);
      });
    },

    observe(key, listener) {
      const listeners = listenersById.get(key.id) ?? new Set();
      const wrapped = (implementation: unknown): void => {
        listener(implementation as typeof key.__contract);
      };

      listeners.add(wrapped);
      listenersById.set(key.id, listeners);

      // Emit the current value immediately so a subscriber never has to also call `get`.
      wrapped(entries.get(key.id)?.implementation);

      return () => {
        listeners.delete(wrapped);
      };
    },

    provided() {
      return [...entries.keys()].sort();
    },
  };
}
