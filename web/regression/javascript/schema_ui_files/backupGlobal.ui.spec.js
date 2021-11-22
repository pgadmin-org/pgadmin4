/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BackupGlobalSchema, {getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backupGlobal.ui';


describe('BackupGlobalSchema', ()=>{
  let mount;
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });
  let backupGlobalSchemaObj = new BackupGlobalSchema(
    ()=> getMiscellaneousSchema(),
    {
      role: ()=>[],
    }
  );

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={backupGlobalSchemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });
});

