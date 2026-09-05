# Commands

Every script in the root `package.json`.

## Running it

| Command | What it does |
| --- | --- |
| `docker compose up` | The whole suite on <http://localhost:8080>. Nothing else needed. |
| `pnpm docker:up` | The same, detached |
| `pnpm docker:logs` | Follow every container's logs |
| `pnpm docker:down` | Stop, keeping both volumes and therefore every edit |
| `pnpm docker:reset` | Stop and drop the volumes, so the next start re-seeds from the fixture |
| `pnpm docker:build` | Rebuild the five images |
| `pnpm dev` | All five apps locally: shell on 5001, People 5002, Delivery 5003, services 3001/3002 |

## Checking it

| Command | What it does |
| --- | --- |
| `pnpm verify` | `format:check`, `lint`, `typecheck`, `test` — what CI runs |
| `pnpm test` | 205 tests across every package. No React, no browser. |
| `pnpm test:coverage` | The same with coverage; the domain packages carry 90–95 % thresholds |
| `pnpm typecheck` | `tsc --noEmit` everywhere, under `strict` |
| `pnpm lint` | ESLint, including the `no-explicit-any` rule the brief requires |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm build` | Turborepo builds every package and app in dependency order |
| `pnpm clean` | Remove `node_modules`, `dist`, `.turbo` and coverage everywhere |

## The one worth running first

```bash
pnpm --filter @repo/acceptance test
```

The brief's reference calculation, asserted from the shipped fixture through the real pricing path.
