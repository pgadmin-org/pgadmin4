/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSDictionarySchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_dictionaries/static/js/fts_dictionary.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSDictionarySchema', ()=>{
  const createSchemaObj = () => new FTSDictionarySchema(
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
    await getCreateView(createSchemaObj());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
  });
});

