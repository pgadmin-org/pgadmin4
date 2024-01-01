/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import MaintenanceSchema, {getVacuumSchema} from '../../../pgadmin/tools/maintenance/static/js/maintenance.ui';
import {getCreateView} from '../genericFunctions';

describe('MaintenanceSchema', ()=>{




  let backupSchemaObj = new MaintenanceSchema(
    ()=> getVacuumSchema(),
    {
      nodeInfo: {schema: {label: 'public'}, server: {version: 90400}}
    }
  );

  it('start maintenance', async ()=>{
    await getCreateView(backupSchemaObj);
  });

});

