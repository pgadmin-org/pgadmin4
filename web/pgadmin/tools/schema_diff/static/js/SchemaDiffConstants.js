/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';

export const PANELS = {
  SCHEMADIFF: 'id-schema-diff',
  RESULTS: 'id-results',
};

export const TYPE = {
  SOURCE: 1,
  TARGET: 2
};

export const MENUS = {
  COMPARE: 'schema-diff-compare',
  GENERATE_SCRIPT: 'schema-diff-generate-script',
  FILTER: 'schema-diff-filter'
};

export const STYLE_CONSTANT = {
  IDENTICAL: 'identical',
  DIFFERENT :'different',
  SOURCE_ONLY: 'source',
  TARGET_ONLY: 'target'
};

export const MENUS_COMPARE_CONSTANT = {
  COMPARE_IGNORE_OWNER: 1,
  COMPARE_IGNORE_WHITESPACE: 2,
  COMPARE_IGNORE_TABLESPACE: 3,
  COMPARE_IGNORE_GRANTS: 4
};

export const MENUS_FILTER_CONSTANT = {
  FILTER_IDENTICAL: 1,
  FILTER_DIFFERENT: 2,
  FILTER_SOURCE_ONLY: 3,
  FILTER_TARGET_ONLY: 4,
};

export const SCHEMA_DIFF_EVENT = {
  TRIGGER_SELECT_SERVER: 'TRIGGER_SELECT_SERVER',
  TRIGGER_SELECT_DATABASE: 'TRIGGER_SELECT_DATABASE',
  TRIGGER_SELECT_SCHEMA: 'TRIGGER_SELECT_DATABASE',

  TRIGGER_COMPARE_DIFF: 'TRIGGER_COMPARE_DIFF',
  TRIGGER_GENERATE_SCRIPT: 'TRIGGER_GENERATE_SCRIPT',
  TRIGGER_CHANGE_FILTER: 'TRIGGER_CHANGE_FILTER',

  TRIGGER_CHANGE_RESULT_SQL: 'TRIGGER_CHANGE_RESULT_SQL',
  TRIGGER_ROW_SELECT: 'TRIGGER_ROW_SELECT',
};

export const FILTER_NAME = {
  IDENTICAL : gettext('Identical'),
  DIFFERENT : gettext('Different'),
  SOURCE_ONLY: gettext('Source Only'),
  TARGET_ONLY: gettext('Target Only')
};

export const IGNORE_OPTION = {
  OWNER : gettext('Ignore Owner'),
  WHITESPACE : gettext('Ignore Whitespace'),
  TABLESPACE: gettext('Ignore Tablespace'),
  GRANTS: gettext('Ignore Grant/Revoke')
};
