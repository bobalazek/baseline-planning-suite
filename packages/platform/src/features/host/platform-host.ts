import { createEventBus, type EventBus } from '../events/event-bus';
import { createServiceRegistry, type ServiceRegistry } from '../registry/service-registry';
import {
  createSession,
  EURO,
  type MutableSessionContract,
  type Session,
  type SessionContract,
} from '../session/session';

/**
 * Everything a remote is given by whoever is hosting it. There is exactly one of these per page,
 * because exactly one is constructed — by the shell when hosted, by the remote's own standalone
 * entry when not. Nothing here is a module-level singleton, so nothing here can be duplicated by
 * Module Federation resolving two copies of a shared package.
 */
export interface PlatformHost {
  readonly registry: ServiceRegistry;
  readonly bus: EventBus;
  readonly session: SessionContract;
}

export interface MutablePlatformHost extends PlatformHost {
  readonly session: MutableSessionContract;
}

/** What a remote returns from `register`. The host awaits `ready` before revealing the UI. */
export interface RemoteRegistration {
  readonly ready: Promise<void>;
  dispose(): void;
}

/** The single entry point every remote exposes. Hosting is a parameter, not a build flag. */
export type RemoteBootstrap = (host: PlatformHost) => RemoteRegistration;

/**
 * Props for a remote's `./App`. The host is passed in rather than read from module scope, so the
 * component a shell renders and the registration a shell made are provably the same host.
 */
export interface RemoteAppProps {
  readonly host: PlatformHost;
}

export interface PlatformHostOptions {
  readonly session?: Session;
  readonly onWarning?: (message: string) => void;
  readonly onHandlerError?: (error: unknown) => void;
}

export const ANONYMOUS_ACTOR = Object.freeze({ id: 'anonymous', name: 'Unassigned planner' });

export function createPlatformHost(options: PlatformHostOptions = {}): MutablePlatformHost {
  const warn = options.onWarning ?? ((message: string) => console.warn(message));

  return {
    registry: createServiceRegistry(warn),
    bus: createEventBus(options.onHandlerError ?? ((error: unknown) => console.error(error))),
    session: createSession(options.session ?? { currency: EURO, actor: ANONYMOUS_ACTOR }),
  };
}
