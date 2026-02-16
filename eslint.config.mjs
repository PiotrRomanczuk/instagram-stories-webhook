import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nextConfig = require('eslint-config-next');
const coreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '__tests__/e2e/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'scripts/**',
      '__tests__/fixtures/**',
    ],
  },
  ...nextConfig,
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // All any types eliminated (INS-15) - enforce as error to prevent regressions
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // Allow unescaped entities in JSX (apostrophes, quotes)
      'react/no-unescaped-entities': 'warn',
      // React compiler rules - downgrade until codebase is updated
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      // Prefer const - auto-fixable, downgrade to warn
      'prefer-const': 'warn',
    },
  },
];

export default eslintConfig;
