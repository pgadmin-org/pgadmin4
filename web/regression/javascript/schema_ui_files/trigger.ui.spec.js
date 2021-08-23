/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
//import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import TriggerSchema, { EventSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/triggers/static/js/trigger.ui';

describe('TriggerSchema', ()=>{
  let mount;
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

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

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

    mount(<SchemaView
      formType='dialog'
      schema={catalogSchemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
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

    mount(<SchemaView
      formType='tab'
      schema={catalogPropertiesSchemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
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

    mount(<SchemaView
      formType='dialog'
      schema={editSchemaObj}
      getInitData={initData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
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

    mount(<SchemaView
      formType='dialog'
      schema={editSchemaObj}
      getInitData={initData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
  });

});


describe('TriggerEventsSchema', ()=>{
  let mount;
  let schemaObj = new EventSchema(
    {
      nodeInfo: {
        server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
        table: {is_partitioned: false}
      }
    }
  );
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
    />);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');


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
