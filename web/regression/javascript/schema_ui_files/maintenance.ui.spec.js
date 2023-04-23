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
import MaintenanceSchema, {getVacuumSchema} from '../../../pgadmin/tools/maintenance/static/js/maintenance.ui';
import {getCreateView} from '../genericFunctions';

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
    mount(getCreateView(backupSchemaObj));
  });

});

