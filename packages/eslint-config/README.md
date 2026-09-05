# @repo/eslint-config

Flat config shared by every workspace package.

- `@repo/eslint-config` — base rules for library and Node packages.
- `@repo/eslint-config/react` — adds `eslint-plugin-react-hooks` for the three frontends.

`@typescript-eslint/no-explicit-any` is an **error**: "TypeScript strict — no `any`" is a hard
constraint of the brief. `packages/shared-common/src/__tests__/repo-static-rules.test.ts` sweeps
the tree for `any` and for `eslint-disable` of that rule so it cannot be waived file by file.
