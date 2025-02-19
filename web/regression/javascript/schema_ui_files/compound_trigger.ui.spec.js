/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CompoundTriggerSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/compound_triggers/static/js/compound_trigger.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('CompoundTriggerSchema', ()=>{

  const createSchemaObj = () => new CompoundTriggerSchema(
    {
      columns: [],
    },
    {
      schema: {},
      server: {user: {name:'enterprisedb', id:0}, server_type: 'ppas', version: 120000},
      table: {}
    }
  );
  let schemaObj = createSchemaObj();
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

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.evnt_truncate = false;
    state.evnt_delete = false;
    state.evnt_update = false;
    state.evnt_insert = false;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('evnt_insert', 'Specify at least one event.');

    state.evnt_insert = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('evnt_insert', null);
  });
});
