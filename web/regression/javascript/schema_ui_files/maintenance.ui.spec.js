/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import MaintenanceSchema, {getVacuumSchema} from '../../../pgadmin/tools/maintenance/static/js/maintenance.ui';


describe('MaintenanceSchema', ()=>{
  let mount;
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });
  let backupSchemaObj = new MaintenanceSchema(
    ()=> getVacuumSchema(),
    {
      nodeInfo: {schema: {label: 'public'}, server: {version: 90400}}
    }
  );

  it('start maintenance', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={backupSchemaObj}
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

