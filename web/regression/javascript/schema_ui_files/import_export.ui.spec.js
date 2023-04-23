/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import ImportExportSchema, {getFileInfoSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/import_export/static/js/import_export.ui';
import {getCreateView} from '../genericFunctions';

describe('ImportExportSchema', ()=>{
  let mount;
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  let importExportSchemaObj = new ImportExportSchema(
    ()=>getFileInfoSchema(),
    ()=>getMiscellaneousSchema(),
    {columns: ()=>[]}
  );

  it('start import export', ()=>{
    mount(getCreateView(importExportSchemaObj));
  });

});
