# Folder structure

```text
apps/             deployable applications, and the test-only acceptance harness
packages/         shared libraries and tooling
infrastructure/   Dockerfile, nginx configuration, compose stack
docs/             the brief, the PRD, the decisions
fixtures/         the seed file, shipped verbatim
```

## Apps

### `apps/shell`

The host. `src/index.ts` is a one-line async boundary into `src/bootstrap.tsx`, which constructs the
single `PlatformHost` and renders `src/app.tsx`.

- `src/config/` reads `/config.json` at runtime
- `src/federation/` registers remotes and loads them; also the fault-injection switch
- `src/features/<feature>/` navigation, session controls, remote panels, the status page

### `apps/people`, `apps/delivery`

Remotes. Each exposes exactly two modules and has a third entry for running alone:

| File                 | Role                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| `src/bootstrap.ts`   | `register(host)`, headless; publishes the contract. Exposed as `./bootstrap`. |
| `src/App.tsx`        | The UI. Exposed as `./App`; takes `{ host }` as a prop.                       |
| `src/standalone.tsx` | Builds a host of its own and calls the same two. Not exposed.                 |
| `src/index.ts`       | The Module Federation async boundary.                                         |

Inside, `src/features/<feature>/` holds the client, the hydrated store, the contract implementation
and the components for that feature. Pure helpers live in `src/utils/*.utils.ts`.

### `apps/people-api`, `apps/delivery-api`

- `src/env.ts`, the service's configuration, and the only place it reads the environment
- `src/server.ts`, builds Fastify, the store and the one error hook
- `src/routes.ts`, the whole HTTP surface in one file
- `src/features/<feature>/*.handler.ts`; one exported `handle*` per file
- `src/features/<feature>/*-manager.ts`, what the service can do to its data

### `apps/acceptance`

Test-only. The single workspace allowed to import both domains, because the brief's reference
calculation spans them. Ships nothing.

## Packages

One `src/index.ts` per package; no nested barrel files. Modules are grouped as
`src/features/<feature>/`, tests as `src/__tests__/`.

## Structural rules

- Organise by feature first.
- Never re-export another package's types or values; import from the source package.
- Import from package roots only, never `@repo/*/src/*`.
- All first-party imports are static and at the top of the file. The only exception is each
  frontend's `src/index.ts`, where Module Federation requires an async boundary.
- One exported React component per file.
