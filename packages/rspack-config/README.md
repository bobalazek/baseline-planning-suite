# @repo/rspack-config

One Rspack + Module Federation factory for the three frontends.

This is build tooling, in the same category as `@repo/tsconfig` and `@repo/eslint-config` — it is
not application coupling. Nothing in it knows what People or Delivery *do*; it knows that one app
hosts and two are hosted, and that all three ship the same React singleton. Each app still builds,
versions and deploys entirely on its own.

Two things it deliberately does **not** do:

* **It never writes a remote URL into a bundle.** The host is built with `remotes: {}`. URLs arrive
  at runtime from `/config.json`, which the container writes from environment variables.
* **It never branches on "standalone" vs "hosted".** A remote declares two entry points into the
  same compiled code — `remoteEntry` for the shell, `standalone` for its own origin — so both
  paths come out of one build and are exercised by one artefact.
