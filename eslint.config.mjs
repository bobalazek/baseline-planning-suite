import base from '@repo/eslint-config';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/coverage/**'] },
  ...base,
];
