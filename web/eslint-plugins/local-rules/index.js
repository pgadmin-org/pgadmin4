/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Local ESLint plugin — rules specific to pgAdmin that don't belong
// in a shared package. Wire from .eslintrc.js as:
//
//   const localRules = require('./eslint-plugins/local-rules');
//   module.exports = [{
//     plugins: { 'pgadmin-local': localRules },
//     rules: { 'pgadmin-local/register-schema': 'error' },
//   }];

'use strict';

module.exports = {
  rules: {
    'register-schema': require('./rules/register-schema'),
  },
};
