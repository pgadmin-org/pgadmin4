/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import EventTriggerSchema from '../../../pgadmin/browser/server_groups/servers/databases/event_triggers/static/js/event_trigger.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('EventTriggerSchema', ()=>{

  const createSchemaObj = () => new EventTriggerSchema(
    {
      role: ()=>[],
      function_names: ()=>[],
    },
    {
      eventowner: 'postgres'
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

    state.eventfunname = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', 'Event trigger function cannot be empty.');

    state.eventfunname = 'Test';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', null);

    state.service = 'Test';
    state.eventfunname = 'Test';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', null);

  });
});

