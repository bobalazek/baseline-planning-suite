# Contracts

Everything that crosses between the two teams, and what deliberately does not.

## People publishes `people/directory`

```ts
interface PeopleContract {
  listEmployees(): readonly Employee[];
  findEmployee(employeeId: EmployeeId): Employee | undefined;
  personMonthHours(employeeId: EmployeeId, month: MonthKey): number;
  quoteMonth(employeeId: EmployeeId, month: MonthKey): MonthQuote;
}

interface MonthQuote {
  workingDays: number;
  segments: readonly { workingDays: number; priced: boolean }[];
  blendedRate: number; // euro per hour, working-day weighted
  unpricedWorkingDays: number; // > 0 ⇒ mark the cell (R1)
}
```

**What does not cross.** `RateRecord`, `hourlyCost`, `validFrom`. A quote's segments carry _how many
working days_ and _whether they were priced at all_, never at what. Delivery can render "this month
is split across two rate periods" and mark unpriced cells without ever learning what anybody earns.
`boundaries.test.ts` greps Delivery's source for those three identifiers and fails if any appears.

## Delivery publishes `delivery/utilisation`

```ts
interface DeliveryContract {
  utilisationFor(employeeId: EmployeeId): readonly MonthUtilisation[];
  utilisationAt(employeeId: EmployeeId, month: MonthKey): MonthUtilisation | undefined;
  oversubscribedEmployeeIds(): readonly EmployeeId[];
}

interface MonthUtilisation {
  month: MonthKey;
  personMonths: number; // summed across EVERY project
  overCapacityBy: number; // person-months beyond capacity; never negative
  projectCount: number;
}
```

**What does not cross.** Projects, the breakdown, allocations, who is on what. People needs to know
how loaded somebody is, not what they are loaded with.

## Events

Both channels carry **ids, never values**. A consumer re-reads through the contract, so the two apps
can never hold divergent copies of each other's state.

| Channel                        | Payload                   | Consumed by                                          |
| ------------------------------ | ------------------------- | ---------------------------------------------------- |
| `people/rates-changed`         | `{ employeeIds }`         | Delivery, drops its memoised quotes and recosts (F7) |
| `people/employees-changed`     | `{ employeeIds }`         | Delivery, names and contracted hours                 |
| `delivery/allocations-changed` | `{ employeeIds, months }` | People, re-reads utilisation (F8)                    |

## Absence is a normal state

`registry.get(key)` returns `TContract | undefined`. That is not defensive style; it is the accurate
type. A remote can fail to load, and one runs standalone with no counterpart at all. The type forces
every consumer to say what it renders instead:

| Missing  | What happens                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| People   | Delivery's grid keeps person-months and % of capacity; Hours and € are disabled and say why; names fall back to ids |
| Delivery | People's register and rate editor are untouched; the utilisation panel reports it is unavailable                    |

## Versioning

Each contract carries `version: 'major.minor'`. The registry warns when a consumer reads across a
major boundary, the minimum honest gesture toward two teams releasing independently, and the hook a
real deployment would hang a compatibility policy on.
