import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      curly: ['error', 'all'],
      'max-statements-per-line': ['error', { max: 1 }],
      'no-nested-ternary': 'error',
      'one-var': ['error', 'never'],
      'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
      'object-curly-newline': [
        'error',
        { ObjectExpression: { minProperties: 2, multiline: true } },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
