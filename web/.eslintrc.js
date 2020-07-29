/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
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
  ],
  'parserOptions': {
    'ecmaVersion': 2018,
    'ecmaFeatures': {
      'jsx': true
    },
    'sourceType': 'module',
  },
  'plugins': [
    'react'
  ],
  'globals': {
    '_': true,
    'module': true,
  },
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': 0,
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'comma-dangle': [
      'error',
      'always-multiline'
    ],
    'no-console': ["error", { allow: ["warn", "error"] }],
    // We need to exclude below for RegEx case
    "no-useless-escape": 0,
  },
  'settings': {
    'react': {
      'version': 'detect',
    },
  }
};
