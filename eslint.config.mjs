import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import blankLineBeforeFunction from './eslint-function-spacing.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx}'],
    plugins: {
      project: { rules: { 'blank-line-before-function': blankLineBeforeFunction } },
    },
    rules: {
      'project/blank-line-before-function': 'error',
      'max-lines': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', { max: 4 }],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'max-depth': ['error', 2],
      complexity: ['error', 10],
      'max-nested-callbacks': ['error', 3],
      'no-else-return': ['error', { allowElseIf: false }],
    },
  },
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
        {
          ObjectExpression: {
            minProperties: 2,
            multiline: true,
            consistent: true,
          },
        },
      ],
    },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
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
