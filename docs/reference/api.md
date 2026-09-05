# API reference

Two services, each owned by a different team. Through the gateway they are mounted at
`/api/people` and `/api/delivery`; each serves the paths below at its own root.

Errors share one envelope: `{ "error": { "message": string, "details"?: string[] } }`.

## people-api

Owns `Employee` and `RateRecord`. Has never heard of a project.

| Method   | Path                | Notes                                                                                                       |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET`    | `/health`           | `{ status, service }`, names itself, so a healthcheck cannot pass against the wrong container               |
| `GET`    | `/snapshot`         | `{ employees, rateRecords }`. The client hydrates from this and then serves the contract synchronously.     |
| `POST`   | `/rate-records`     | `{ employeeId, validFrom, hourlyCost }` → 201. `409` if that employee already has a rate starting that day. |
| `PATCH`  | `/rate-records/:id` | `{ validFrom?, hourlyCost? }`. Retroactive corrections are allowed and are the point of R1.                 |
| `DELETE` | `/rate-records/:id` | `204`. Removing every rate is legal; the person's work then costs zero and the cells are marked.            |

## delivery-api

Owns `Project`, `BreakdownItem` and `Allocation`. Has no rates and could not price a plan.

| Method   | Path                   | Notes                                                                                                                                                                                                 |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/health`              | `{ status, service }`                                                                                                                                                                                 |
| `GET`    | `/snapshot`            | `{ projects, breakdownItems, allocations }`, **every** project, because R5's capacity check is only correct when all of them are counted                                                              |
| `PUT`    | `/allocations`         | `{ breakdownItemId, employeeId, month, amount, updatedBy }`. `amount: 0` clears the cell. `400` on a work package that has children (R4). Over capacity is flagged by the reader, never blocked here. |
| `POST`   | `/breakdown-items`     | `{ projectId, parentId, name }` → 201. Inserting beneath a leaf moves that leaf's allocations onto the new child, in one atomic write (R4).                                                           |
| `PATCH`  | `/breakdown-items/:id` | `{ name?, parentId? }`, rename and move are the same call. `400` on a move that would put an item inside its own subtree.                                                                             |
| `DELETE` | `/breakdown-items/:id` | `204`. Takes the whole subtree and everything allocated inside it.                                                                                                                                    |

## What is not here

No endpoint returns a cost. Cost is `hours × blendedRate`, and the two halves of that product are
owned by different teams, see [../architecture/contracts.md](../architecture/contracts.md).
