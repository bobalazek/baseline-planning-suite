# @repo/tsconfig

Shared TypeScript configuration.

| Config | Use for |
| --- | --- |
| `base.json` | Compiler strictness. Never extended directly by a package. |
| `library.json` | `packages/*` — emits declarations to `dist` for editors and `tsc -b`; consumers import `src`. |
| `node.json` | `apps/*-api` — bundled by tsup, run by Node. |
| `react.json` | `apps/{shell,people,delivery}` — DOM libs, automatic JSX runtime, type-check only. |

`strict` is on, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. The brief's
"TypeScript strict — no `any`" is enforced by `@typescript-eslint/no-explicit-any` in
`@repo/eslint-config`, and by a repo static rule test.
