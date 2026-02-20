// eslint.config.mjs — ESLint v9 flat config
// Next.js 16 removed `next lint`; use `eslint .` with eslint-config-next directly.
// eslint-config-next >=15 already exports flat config arrays natively.

import nextConfig from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
    // Additional ignores (eslint-config-next already ignores .next/, out/, build/)
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'src/legacy/**',
        ],
    },
    // Next.js recommended rules: React, react-hooks, @next/next, jsx-a11y, import,
    // plus core-web-vitals enforcement on top.
    ...nextConfig,
];

export default eslintConfig;
