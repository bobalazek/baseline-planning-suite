# ADR-0004 — Shell-owned service registry and event bus, injected at runtime

**Status:** accepted · **Relates to:** F2, F7, F8, F9

## Context

A rate edited in People must reach any open Delivery cost view **with no reload**, and
over-capacity must be flagged in both apps — which means Delivery's allocation totals have to reach
People too. Traffic is bidirectional. Neither app may import the other's source.

## Decision

The **shell owns a single platform instance** and hands it to each remote:

```ts
// exposed by every remote, called once by whoever is hosting it
export function register(host: PlatformHost): RemoteRegistration;

interface PlatformHost {
  registry: ServiceRegistry; // provide / get / whenAvailable, keyed by contract
  bus: EventBus; // publish / subscribe, typed domain events
  session: SessionContract; // display currency + active user, shell-owned (F2)
}
```

- People registers `PeopleContract` (register queries, `PricingContract`, capacity).
- Delivery registers `DeliveryContract` (`utilisationFor(employeeId)` — person-months summed across
  **every** project, per R5).
- Each consumes the other only through `registry.get(...)`, which may return `undefined`.
- Mutations publish `rates-changed` / `allocations-changed`; the other side subscribes and
  invalidates.

Remotes expose two modules: `./bootstrap` (headless, tiny, registers the contract) and `./App`
(the UI). The shell loads **both bootstraps at startup** and each `App` lazily on navigation, so
cross-app data is live even when the other app's screen has never been opened.

## Why

- **Dependency injection beats a shared singleton.** The obvious alternative is a
  `@repo/platform` module marked `singleton: true` in Module Federation and imported directly by
  both remotes. That makes correctness depend on version negotiation across three independently
  released builds — the classic way federated apps end up with two "singletons". Passing the host in
  removes the failure mode entirely: there is exactly one instance because exactly one object was
  constructed, by the shell. React is the only true shared singleton, where it is unavoidable.
- **It is the same seam standalone mode needs.** A remote running on its own origin constructs its
  own `PlatformHost` and calls its own `register`. One codebase, one build, two hosts — because
  hosting is a parameter (see ADR-0005).
- **`registry.get` returning `undefined` is the isolation story.** If Delivery's bootstrap never
  loaded, People's utilisation column renders "unavailable" instead of throwing. Degradation is
  typed into the contract rather than bolted on with try/catch.
- **The bus carries events, not state.** Events name what changed (`{ employeeIds, months }`);
  the consumer re-reads through the contract. No state is replicated across the boundary, so the two
  apps can never disagree about who owns what.

## Consequences

- `@repo/contracts` is a shared _type_ package plus registry keys. It has no state, so a
  duplicated copy across builds is harmless.
- Contract methods are synchronous over each remote's hydrated projection; `register` returns a
  `ready` promise the shell awaits before revealing the UI.
- Contracts are versioned (`version: '1.0'`) and the registry logs a warning on a major mismatch —
  the minimum honest gesture toward two teams releasing independently.

## Alternatives rejected

- **`window` globals / `CustomEvent`.** Untyped, unversioned, and invisible to the type checker.
- **Server-sent events from the two APIs.** Solves cross-browser propagation, not the in-page
  contract question, and would make Delivery depend on People's HTTP surface — the coupling this
  ADR exists to avoid. Sensible as a later addition behind the same `bus`.
