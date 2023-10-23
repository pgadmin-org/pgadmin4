/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import EDBFuncSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/edbfuncs/static/js/edbfunc.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('EDBFuncSchema', ()=>{

  let edbFuncSchemaObj = new EDBFuncSchema(
    {}, {
      name: 'sysfunc'
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(edbFuncSchemaObj);
  });

  it('edit', async ()=>{
    await getEditView(edbFuncSchemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(edbFuncSchemaObj, getInitData);
  });
});

