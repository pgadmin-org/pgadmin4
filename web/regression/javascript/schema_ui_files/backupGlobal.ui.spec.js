/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BackupGlobalSchema, {getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backupGlobal.ui';
import Theme from '../../../pgadmin/static/js/Theme';


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
    mount(<Theme>
      <SchemaView
        formType='dialog'
        schema={backupGlobalSchemaObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{/*This is intentional (SonarQube)*/}}
        onClose={()=>{/*This is intentional (SonarQube)*/}}
        onHelp={()=>{/*This is intentional (SonarQube)*/}}
        onDataChange={()=>{/*This is intentional (SonarQube)*/}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />
    </Theme>);
  });
});

