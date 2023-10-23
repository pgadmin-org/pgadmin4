/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import TriggerSchema, { EventSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/triggers/static/js/trigger.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('TriggerSchema', ()=>{

  let schemaObj = new TriggerSchema(
    {
      triggerFunction: [],
      columns: [],
      nodeInfo: {
        schema: {},
        server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
        table: {is_partitioned: false}
      }
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

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.tfunction = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tfunction', 'Trigger function cannot be empty.');

    state.tfunction = 'public';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tfunction', null);
  });

  it('catalog create', ()=>{
    let catalogSchemaObj = new TriggerSchema(
      {
        triggerFunction: [],
        columns: [],
        nodeInfo: {
          catalog: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
          table: {is_partitioned: false}
        }
      }
    );

    getCreateView(catalogSchemaObj);
  });

  it('catalog properties', ()=>{
    let catalogPropertiesSchemaObj = new TriggerSchema(
      {
        triggerFunction: [],
        columns: [],
        nodeInfo: {
          catalog: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
          table: {is_partitioned: false}
        }
      }
    );

    getPropertiesView(catalogPropertiesSchemaObj, getInitData);
  });

  it('edit disableTransition', ()=>{
    let editSchemaObj = new TriggerSchema(
      {
        triggerFunction: [],
        columns: [],
        nodeInfo: {
          catalog: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 100000},
          table: {is_partitioned: false}
        }
      }
    );

    let initData = ()=>Promise.resolve({
      tgoldtable: 'tgoldtable',
      evnt_insert: true,
      evnt_update: true,
      evnt_delete: true,
      is_constraint_trigger: true,
      name: 'tgoldtable',
      fires: 'AFTER'
    });

    getEditView(editSchemaObj, initData);
  });

  it('edit disableTransition tgnewtable', ()=>{
    let editSchemaObj = new TriggerSchema(
      {
        triggerFunction: [],
        columns: [],
        nodeInfo: {
          catalog: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 100000},
          table: {is_partitioned: false}
        }
      }
    );

    let initData = ()=>Promise.resolve({
      tgoldtable: 'tgnewtable',
      evnt_insert: true,
      evnt_update: true,
      evnt_delete: true,
      is_constraint_trigger: false,
      name: 'tgnewtable',
      fires: 'AFTER'
    });

    getEditView(editSchemaObj, initData);
  });

});


describe('TriggerEventsSchema', ()=>{

  let schemaObj = new EventSchema(
    {
      nodeInfo: {
        server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
        table: {is_partitioned: false}
      }
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();


    state.tfunction = 'public';
    state.evnt_truncate = false;
    state.evnt_delete = false;
    state.evnt_update = false;
    state.evnt_insert = false;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('evnt_insert', 'Specify at least one event.');

    state.tfunction = 'public';
    state.evnt_insert = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('evnt_insert', null);
  });
});
