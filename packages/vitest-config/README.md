# @repo/vitest-config

One Vitest factory so every package runs tests the same way.

```ts
import { createNodeConfig } from '@repo/vitest-config';

export default createNodeConfig({ coverage: true });
```

Everything in this repo that is worth testing is a pure function, so the default environment is
`node`. Nothing mounts React: the brief says the calculation logic is what gets read hardest, and
it is all reachable without a DOM.
