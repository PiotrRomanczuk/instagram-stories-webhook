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
    ],
  },
];

export default eslintConfig;
