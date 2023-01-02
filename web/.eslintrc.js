/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'amd': true,
    'jasmine': true,
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    /* Uncomment the below line to use linter error for React Hooks.
       By Default commented so that builds are generated successfully.
       Once all the errors will be resolved will uncomment it and commit it.
    */
    // "plugin:react-hooks/recommended",
  ],
  'parser': '@babel/eslint-parser',
  'parserOptions': {
    'requireConfigFile': false,
    'ecmaVersion': 2018,
    'ecmaFeatures': {
      'jsx': true,
    },
    'sourceType': 'module',
    'babelOptions': {
      'plugins': [
        '@babel/plugin-syntax-jsx',
        '@babel/plugin-proposal-class-properties',
      ],
    },
  },
  'plugins': [
    'react',
    '@babel',
  ],
  'globals': {
    '_': true,
    'module': true,
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
    'no-useless-escape': 0,
    'no-prototype-builtins': 0,
    'no-global-assign': 0,
    'no-import-assign': 0,
  },
  'settings': {
    'react': {
      'version': 'detect',
    },
  },
};
