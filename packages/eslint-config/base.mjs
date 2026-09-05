import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];

export default [
  { ignores: ['coverage/**', 'dist/**', 'node_modules/**', '**/*.d.ts'] },
  js.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    rules: {
      // "TypeScript strict — no `any`" is a hard constraint of the brief, so it is an error here
      // rather than a warning, and there is no eslint-disable for it anywhere in the repo.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // AGENTS.md rule 8: first-party imports are static and live at the top of the file.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/^(@repo\\u002F|[.]{1,2}\\u002F)/]',
          message:
            'First-party imports must be static. Refactor the shape instead of hiding a cycle behind a lazy import.',
        },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  eslintConfigPrettier,
];
