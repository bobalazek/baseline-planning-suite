import type { ContractKey, PlatformHost, Session } from '@repo/platform';
import type { PeopleStore, RegisterSnapshot } from '../features/register/people-store';
/** The register as one immutable object; a new one appears whenever anything changes. */
export declare function usePeopleSnapshot(store: PeopleStore): RegisterSnapshot;
/** Display currency and active user, owned by the shell and pushed in at runtime (F2). */
export declare function useSession(host: PlatformHost): Session;
/**
 * A contract published by the *other* team, which may simply not be there.
 *
 * `undefined` is a first-class answer, not an error state: if Delivery failed to load, People still
 * has a register to show, and the type forces every caller to say what it renders instead (F9).
 */
export declare function useContract<TContract>(host: PlatformHost, key: ContractKey<TContract>): TContract | undefined;
/** Bumps whenever the given event fires, so a view can re-read through a contract. */
export declare function useEventRevision(host: PlatformHost, channel: Parameters<PlatformHost['bus']['subscribe']>[0]): number;
