/**
 * A typed key for one published contract.
 *
 * The phantom `__contract` property is never assigned at runtime; it exists so that
 * `registry.get(PEOPLE_CONTRACT)` is typed as `PeopleContract | undefined` without the registry
 * itself ever having to know that People exists. That is the whole trick that lets `@repo/platform`
 * sit *below* both contract packages in the dependency graph instead of importing from both of
 * them and creating a cycle.
 */
export interface ContractKey<TContract> {
  readonly id: string;
  /** `major.minor`. Consumers warn on a major mismatch, two teams, two release trains. */
  readonly version: string;
  readonly __contract?: TContract;
}

export function defineContract<TContract>(id: string, version: string): ContractKey<TContract> {
  return Object.freeze({ id, version });
}

export function majorVersionOf(version: string): string {
  return version.split('.')[0] ?? version;
}
