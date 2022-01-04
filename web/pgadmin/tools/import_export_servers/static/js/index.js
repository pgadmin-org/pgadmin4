/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import pgAdmin from 'sources/pgadmin';
import pgBrowser from 'top/browser/static/js/browser';
import ImportExportServersModule from './import_export_servers';

if(!pgAdmin.Tools) {
  pgAdmin.Tools = {};
}
pgAdmin.Tools.ImportExportServersModule = ImportExportServersModule.getInstance(pgAdmin, pgBrowser);

module.exports = {
  ImportExportServersModule: ImportExportServersModule,
};
