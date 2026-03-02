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
];
