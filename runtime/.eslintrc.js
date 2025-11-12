/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import globals from 'globals';
import js from '@eslint/js';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    ignores: [
      'generated',
      'node_modules',
      'vendor',
      'templates/',
      'templates\\',
      'ycache',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2017,
        ...globals.amd,
        '_': 'readonly',
        'module': 'readonly',
        'process': 'readonly',
        'platform': 'readonly',
      },
    },
    'plugins': {
      'unused-imports': unusedImports,
    },
    'rules': {
      'indent': [
        'error',
        2,
      ],
      'linebreak-style': 0,
      'quotes': [
        'error',
        'single',
      ],
      'semi': [
        'error',
        'always',
      ],
      'comma-dangle': [
        'error',
        'always-multiline',
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // We need to exclude below for RegEx case
      'no-useless-escape': 0,
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_',
        },
      ],
    },
  },
];
