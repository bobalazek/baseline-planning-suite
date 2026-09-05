# Docs

| Document                                                         | Use it for                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [overview.md](./overview.md)                                     | What this is and how the pieces fit. Read first.                          |
| [../README.md](../README.md)                                     | How to run it, how to break a remote, what to try                         |
| [project/prd.md](./project/prd.md)                               | Every requirement of the brief, restated as testable items                |
| [project/decisions/](./project/decisions/)                       | The six decisions the brief leaves open, and why each went the way it did |
| [project/plan.md](./project/plan.md)                             | The order the work was done in, and the test strategy                     |
| [architecture/packages.md](./architecture/packages.md)           | The dependency graph and what each package is for                         |
| [architecture/contracts.md](./architecture/contracts.md)         | What crosses between the two teams, and what deliberately does not        |
| [conventions/README.md](./conventions/README.md)                 | The coding rules, and which ones are enforced mechanically                |
| [reference/folder-structure.md](./reference/folder-structure.md) | Where code belongs                                                        |
| [reference/commands.md](./reference/commands.md)                 | Every script in the root `package.json`                                   |
| [reference/api.md](./reference/api.md)                           | The two services' HTTP surfaces                                           |
| [innoscripta-task.pdf](./innoscripta-task.pdf)                   | The original brief                                                        |

## Reading order for a reviewer

1. [../README.md](../README.md) — run it, then break it.
2. [project/decisions/0002-rate-cost-boundary.md](./project/decisions/0002-rate-cost-boundary.md) —
   the decision the brief says it is assessing.
3. `apps/acceptance/src/__tests__/reference-calculation.test.ts` — the five numbers, from the
   shipped fixture, through the real pricing path.
4. [architecture/contracts.md](./architecture/contracts.md) — the seam between the two teams.
