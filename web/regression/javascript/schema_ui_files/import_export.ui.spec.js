/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ImportExportSchema, {getFileInfoSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/import_export/static/js/import_export.ui';
import {getCreateView} from '../genericFunctions';

describe('ImportExportSchema', ()=>{





  let importExportSchemaObj = new ImportExportSchema(
    ()=>getFileInfoSchema(),
    ()=>getMiscellaneousSchema(),
    {columns: ()=>[]}
  );

  it('start import export', async ()=>{
    await getCreateView(importExportSchemaObj);
  });

});
