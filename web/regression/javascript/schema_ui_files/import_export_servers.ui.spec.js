/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ImportExportSelectionSchema from '../../../pgadmin/tools/import_export_servers/static/js/import_export_selection.ui';
import {genericBeforeEach, getCreateView} from '../genericFunctions';

describe('ImportExportServers', () => {


  beforeEach(() => {
    genericBeforeEach();
  });

  it('import', async () => {
    const schemaObj = new ImportExportSelectionSchema();
    await getCreateView(schemaObj);
  });

  it('export', async () => {
    const schemaObj = new ImportExportSelectionSchema({
      imp_exp: 'e', filename: 'test.json'
    });

    await getCreateView(schemaObj);
  });
});
