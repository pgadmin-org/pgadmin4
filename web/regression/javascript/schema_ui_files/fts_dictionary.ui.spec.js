/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSDictionarySchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_dictionaries/static/js/fts_dictionary.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSDictionarySchema', ()=>{

  let schemaObj = new FTSDictionarySchema(
    {
      role: ()=>[],
      schema: ()=>[],
      fts_template: ()=>[],
    },
    [],
    {
      owner: 'postgres',
      schema: 'public',
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

