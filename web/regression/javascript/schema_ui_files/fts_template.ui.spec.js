/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSTemplateSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_templates/static/js/fts_template.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSTemplateSchema', ()=>{

  let schemaObj = new FTSTemplateSchema(
    {
      schemaList: ()=> [],
      initFunctionList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      lexisFunctionList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
    },
    {
      schema: 123
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });
});

