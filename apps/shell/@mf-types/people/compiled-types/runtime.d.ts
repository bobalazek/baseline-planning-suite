import type { PeopleContract } from '@repo/people-contracts';
import type { PeopleStore } from './features/register/people-store';
/** What `register` builds and `./App` consumes, for one host. */
export interface PeopleRuntime {
    readonly store: PeopleStore;
    readonly contract: PeopleContract;
}
