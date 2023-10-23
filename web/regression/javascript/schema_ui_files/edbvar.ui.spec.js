/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import EDBVarSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/edbvars/static/js/edbvar.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('EDBVarSchema', ()=>{

  let edbVarSchemaObj = new EDBVarSchema();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(edbVarSchemaObj);
  });

  it('edit', async ()=>{
    await getEditView(edbVarSchemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(edbVarSchemaObj, getInitData);
  });
});

