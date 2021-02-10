/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* This file contains the source of the queries in the history and their
   respective icons css classes */

export const QuerySources = {
  EXECUTE: {
    ICON_CSS_CLASS: 'fa fa-play',
  },
  EXPLAIN: {
    ICON_CSS_CLASS: 'fa fa-hand-pointer',
  },
  EXPLAIN_ANALYZE: {
    ICON_CSS_CLASS: 'fa fa-list-alt',
  },
  COMMIT: {
    ICON_CSS_CLASS: 'pg-font-icon icon-commit',
  },
  ROLLBACK: {
    ICON_CSS_CLASS: 'pg-font-icon icon-rollback',
  },
  SAVE_DATA: {
    ICON_CSS_CLASS: 'pg-font-icon icon-save_data_changes',
  },
  VIEW_DATA: {
    ICON_CSS_CLASS: 'pg-font-icon picon-view_data',
  },
};
