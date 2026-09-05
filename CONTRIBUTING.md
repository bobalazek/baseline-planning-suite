# Contributing

## Setup

```bash
pnpm install
pnpm dev            # shell 5001, People 5002, Delivery 5003, services 3001/3002
```

The dev servers proxy `/api/people` and `/api/delivery` to the local services, so the frontends use
the same relative paths they use behind the gateway in Docker. There is no environment file and no
CORS anywhere.

Prefer the container stack when you want the real topology:

```bash
docker compose up   # http://localhost:8080
```

## Making a change

1. Find the rule. Every requirement of the brief is an item in
   [docs/project/prd.md](./docs/project/prd.md) with an id (R1–R5, F1–F9), and every test that
   defends one names it.
2. Change the domain first, in `packages/*`. If a change can be expressed as a pure function, it
   belongs there and is tested there.
3. Run `pnpm verify`.

## Commits

Conventional commits (`feat(scope): …`). The body says _why_ — the tests already say what.

## Decisions

A choice that would surprise the next reader goes in `docs/project/decisions/` as a numbered ADR
with the alternatives that were rejected. Six exist; they cover the things the brief left open.
