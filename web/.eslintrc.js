/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
const globals = require('globals');
const js = require('@eslint/js');
const reactjs = require('eslint-plugin-react');
const jest = require('eslint-plugin-jest');
const babel = require('@babel/eslint-plugin');
const babelParser = require('@babel/eslint-parser');
const ts = require('typescript-eslint');


module.exports = [
  {
    ignores: [
      '**/generated',
      '**/node_modules',
      '**/vendor',
      '**/templates/',
      '**/templates\\',
      '**/ycache',
      '**/regression/htmlcov',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      'parser': babelParser,
      ecmaVersion: 2018,
      parserOptions: {
        'ecmaFeatures': {
          'jsx': true,
        },
        'requireConfigFile': false,
        'babelOptions': {
          'plugins': [
            '@babel/plugin-syntax-jsx',
            '@babel/plugin-proposal-class-properties',
          ],
        },
      },
      'sourceType': 'module',
      globals: {
        ...globals.browser,
        ...globals.es2017,
        ...globals.amd,
        '_': 'readonly',
        'module': 'readonly',
        '__dirname': 'readonly',
        'global': 'readonly',
        'jest': 'readonly',
        'process': 'readonly',
      },
    },
    'plugins': {
      'react': reactjs,
      '@babel': babel,
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
        'only-multiline',
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // We need to exclude below for RegEx case
      'no-useless-escape': 'off',
      'no-prototype-builtins': 'off',
      'no-global-assign': 'off',
      'no-import-assign': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error'
    },
    'settings': {
      'react': {
        'version': 'detect',
      },
    },
  },
  {
    'files': ['**/*.{ts,tsx}'],
    languageOptions: {
      'parser': ts.parser,
    },
    'plugins': {
      '@typescript-eslint': ts.plugin,
    },
    'rules': {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-this-alias': ['off'],
    }
  },
  {
    'files': ['**/*{spec,test}.{js,jsx}', './regression/javascript/**/*.{js}'],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/prefer-expect-assertions': 'off',
      'jest/expect-expect': 'off',
      'jest/no-identical-title': 'off',
      'jest/no-done-callback': 'off',
      'jest/no-conditional-expect': 'off',
      'jest/valid-title': 'off',
    },
  }
];
