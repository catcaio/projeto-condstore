const tsParser = require('@typescript-eslint/parser');

const noopRule = { create: () => ({}) };
const reactPlugin = { rules: { 'no-danger': noopRule } };
const tsPlugin = {
  rules: {
    'no-var-requires': noopRule,
    'no-explicit-any': noopRule,
  },
};

module.exports = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'drizzle/**'],
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
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {},
  },
];
