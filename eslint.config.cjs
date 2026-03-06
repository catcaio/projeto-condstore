const tsParser = require('@typescript-eslint/parser');

const noopRule = { create: () => ({}) };
const reactPlugin = { rules: { 'no-danger': noopRule } };
const a11yPlugin = { rules: { 'no-autofocus': noopRule } };
const reactHooksPlugin = { rules: { 'exhaustive-deps': noopRule, 'rules-of-hooks': noopRule } };
const tsPlugin = {
  rules: {
    'no-var-requires': noopRule,
    'no-explicit-any': noopRule,
    'no-useless-constructor': noopRule,
  },
};

module.exports = [
  {
    ignores: ['.next/**', '.next*/**', 'node_modules/**', 'dist/**', 'drizzle/**', '.claude/**', '.vercel/**', 'coverage/**', 'out/**'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {},
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'jsx-a11y': a11yPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {},
  },
  // no-console enforcement for server-side production code only
  {
    files: ['src/app/api/**/*.ts', 'src/infra/**/*.ts', 'src/lib/**/*.ts', 'src/modules/**/*.ts'],
    ignores: [
      'src/infra/log/logger.ts',    // Logger implementation uses console.log internally
      'src/infra/logger.ts',         // Logger implementation uses console.debug/error internally
      'src/lib/engine/test-run.ts',  // Test runner script
    ],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    },
  },
];
