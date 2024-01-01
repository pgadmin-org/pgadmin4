/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import SchemaDiff from './SchemaDiffModule';

if (!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}

pgAdmin.Tools.SchemaDiff = SchemaDiff.getInstance(pgAdmin, pgBrowser);

module.exports = {
  SchemaDiff: SchemaDiff,
};
