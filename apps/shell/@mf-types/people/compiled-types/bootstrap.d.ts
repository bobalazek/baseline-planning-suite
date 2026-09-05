import type { PlatformHost, RemoteRegistration } from '@repo/platform';
import type { PeopleRuntime } from './runtime';
/**
 * The headless half of the People remote.
 *
 * The shell loads this at start-up for *both* remotes, before either screen has been opened, so
 * Delivery can price a grid the moment it is navigated to and People can flag over-capacity on
 * first paint. Nothing here mounts React.
 */
export declare function register(host: PlatformHost): RemoteRegistration;
export declare function runtimeFor(host: PlatformHost): PeopleRuntime | undefined;
