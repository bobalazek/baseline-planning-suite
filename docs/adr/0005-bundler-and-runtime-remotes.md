# ADR-0005 — Rspack + Module Federation 2, remotes registered from `/config.json`

**Status:** accepted · **Relates to:** "Three federated builds", "Remote URLs resolve at runtime",
"Standalone and hosted", "The bundler"

## Decision

**Rspack 2** with `ModuleFederationPlugin` from `@module-federation/enhanced/rspack`.

* Shell builds with **no remotes in its configuration**. At boot it fetches `/config.json`, then
  calls `registerRemotes()` from `@module-federation/enhanced/runtime` and `loadRemote()`.
* `config.json` is written by the shell container's entrypoint from environment variables. Changing
  where People is served requires an env var and a restart, never a rebuild.
* Every app sets `publicPath: 'auto'` so a remote's chunks resolve relative to wherever its
  `remoteEntry` was fetched from.

## Why Rspack

Module Federation 2 is first-class in Rspack and Webpack only, so Vite was out on the constraint
itself (`@module-federation/vite` exists but reimplements the runtime and does not carry the
manifest format). Between the two, Rspack builds this workspace roughly an order of magnitude
faster, which matters when `docker compose up` from a clean clone has to build three frontends. The
plugin, config surface and runtime are the same package, so nothing about the federation story is
Rspack-specific.

## Why runtime registration rather than build-time `remotes`

Putting `remotes: { people: 'people@http://…/remoteEntry.js' }` in the shell's config bakes a
deployment topology into a bundle. `registerRemotes` takes the same descriptor as data, so:

* the identical shell image runs in compose, staging and production;
* the fault-injection switch (F9) works by pointing an entry at a URL that 404s — a real load
  failure, not a mocked one.

## Standalone and hosted from one build

Each remote's Rspack config declares two entry points into the same compiled code:

| Entry | Output | Used by |
| --- | --- | --- |
| `remoteEntry` (via `exposes`) | `./bootstrap`, `./App` | the shell |
| `standalone` | `standalone.js` + `index.html` | direct browsing of the remote's own origin |

The standalone entry constructs a `PlatformHost` (ADR-0004), calls the same `register`, and mounts
the same `App`. There is no `if (standalone)` anywhere in application code — hosting is a
parameter, so both paths are exercised by one build artefact.

## Shared modules

`react`, `react-dom` and `react/jsx-runtime` are `singleton: true` with `requiredVersion` pinned to
the workspace version — React is the one thing that genuinely breaks when duplicated (hooks,
context). `@baseline/contracts` is shared but not singleton: it is types plus frozen key constants,
so a duplicate is inert. Nothing stateful is shared, by construction (ADR-0004).

## Consequences

* The shell shows a per-panel failure state when `loadRemote` rejects, and keeps its own chrome.
* `mf-manifest.json` is emitted by each remote and is what the shell registers, so the shell learns
  a remote's shared-dependency requirements at runtime instead of assuming them.
