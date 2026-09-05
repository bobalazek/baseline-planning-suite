import type { PlatformHost, RemoteRegistration } from '@repo/platform';
import type { DeliveryRuntime } from './runtime';
/**
 * The headless half of the Delivery remote. Loaded by the shell at start-up so People can flag
 * over-capacity before Delivery's screen has ever been opened (R5, F8).
 */
export declare function register(host: PlatformHost): RemoteRegistration;
export declare function runtimeFor(host: PlatformHost): DeliveryRuntime | undefined;
