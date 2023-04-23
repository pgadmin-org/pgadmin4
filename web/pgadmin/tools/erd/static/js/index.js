/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import 'pgadmin.tools.file_manager';
import ERDModule from './ERDModule';

if(!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}
pgAdmin.Tools.ERD = ERDModule.getInstance(pgAdmin, pgBrowser);

module.exports = {
  ERD: pgAdmin.Tools.ERD,
};
