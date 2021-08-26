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
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import FunctionSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/function.ui';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('FunctionSchema', ()=>{
  let mount;
  //Procedure schema
  let procedureSchemaObj = new FunctionSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: [],
      schema: [],
      getLanguage: [],
      getTypes: [],
      getSupportFunctions: [],
    },
    {
      node_info: {
        connected: true,
        user: {id: 10, name: 'postgres', is_superuser: true, can_create_role: true, can_create_db: true},
        user_id: 1,
        user_name: 'postgres',
        version: 130005,
        server: {
          host: '127.0.0.1',
          port: 5432,
          server_type: 'postgres',
          user: {
            id: 10,
            name: 'postgres',
            is_superuser: true,
            can_create_role: true,
            can_create_db: true,
          },
        }      },
    },
    {
      type: 'procedure',
    },
    {
      funcowner: 'postgres',
      pronamespace: 'public',
    }
  );


  let schemaObj = new FunctionSchema(
    () => new MockSchema(),
    () => new MockSchema(),
    {
      role: [],
      schema: [],
      getLanguage: [],
      getTypes: [],
      getSupportFunctions: [],
    },
    {
      node_info: {
        connected: true,
        user: {
          id: 10,
          name: 'postgres',
          is_superuser: true,
          can_create_role: true,
          can_create_db: true,
        },
        user_id: 1,
        user_name: 'postgres',
        version: 130005,
        server: {
          host: '127.0.0.1',
          port: 5432,
          server_type: 'postgres',
          user: {
            id: 10,
            name: 'postgres',
            is_superuser: true,
            can_create_role: true,
            can_create_db: true,
          },
        },
      },
    },
    {
      type: 'function',
    },
    {
      funcowner: 'postgres',
      pronamespace: 'public',
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

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={procedureSchemaObj}
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
  
  it('proiswindow visible', ()=>{

    
    let editSchemaObj = new FunctionSchema(
      () => new MockSchema(),
      () => new MockSchema(),
      {
        role: [],
        schema: [],
        getLanguage: [],
        getTypes: [],
        getSupportFunctions: [],
      },
      {
        node_info: {
          catalog: {},
          connected: true,
          user_id: 1,
          user_name: 'postgres',
          version: 130005,
          server: {
            host: '127.0.0.1',
            port: 5432,
            server_type: 'postgres',
            user: {
              id: 10,
              name: 'postgres',
              is_superuser: true,
              can_create_role: true,
              can_create_db: true,
            },
          },
        },
      },
      {
        type: 'function',
      },
      {
        funcowner: 'postgres',
        pronamespace: 'public',
      }
    );

    let initData = ()=>Promise.resolve({
      sysfunc: true,
      type: 'function',
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

  it('proiswindow visible', ()=>{

    
    let editSchemaObj = new FunctionSchema(
      () => new MockSchema(),
      () => new MockSchema(),
      {
        role: [],
        schema: [],
        getLanguage: [],
        getTypes: [],
        getSupportFunctions: [],
      },
      {
        node_info: {
          catalog: {},
          connected: true,
          user_id: 1,
          user_name: 'postgres',
          version: 130005,
          server: {
            host: '127.0.0.1',
            port: 5432,
            server_type: 'postgres',
            user: {
              id: 10,
              name: 'postgres',
              is_superuser: true,
              can_create_role: true,
              can_create_db: true,
            },
          },
        },
      },
      {
        type: 'function',
      },
      {
        funcowner: 'postgres',
        pronamespace: 'public',
      }
    );

    let initData = ()=>Promise.resolve({
      sysproc: true,
      type: 'function',
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
  
  it('proiswindow visible', ()=>{

    
    let editSchemaObj = new FunctionSchema(
      () => new MockSchema(),
      () => new MockSchema(),
      {
        role: [],
        schema: [],
        getLanguage: [],
        getTypes: [],
        getSupportFunctions: [],
      },
      {
        node_info: {
          connected: true,
          user_id: 1,
          user_name: 'postgres',
          version: 130005,
          server: {
            host: '127.0.0.1',
            port: 5432,
            server_type: 'postgres',
            user: {
              id: 10,
              name: 'postgres',
              is_superuser: true,
              can_create_role: true,
              can_create_db: true,
            },
          },
        },
      },
      {
        type: 'procedure',
      },
      {
        funcowner: 'postgres',
        pronamespace: 'public',
      }
    );

    let initData = ()=>Promise.resolve({
      sysfunc: true,
      type: 'procedure',
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

  it('proiswindow visible', ()=>{

    
    let editSchemaObj = new FunctionSchema(
      () => new MockSchema(),
      () => new MockSchema(),
      {
        role: [],
        schema: [],
        getLanguage: [],
        getTypes: [],
        getSupportFunctions: [],
      },
      {
        node_info: {
          connected: true,
          user_id: 1,
          user_name: 'postgres',
          version: 130005,
          server: {
            host: '127.0.0.1',
            port: 5432,
            server_type: 'postgres',
            user: {
              id: 10,
              name: 'postgres',
              is_superuser: true,
              can_create_role: true,
              can_create_db: true,
            },
          },
        },
      },
      {
        type: 'procedure',
      },
      {
        funcowner: 'postgres',
        pronamespace: 'public',
      }
    );

    let initData = ()=>Promise.resolve({
      sysproc: true,
      type: 'procedure',
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


  it('proparallel disabled', ()=>{

    
    let editSchemaObj = new FunctionSchema(
      () => new MockSchema(),
      () => new MockSchema(),
      {
        role: [],
        schema: [],
        getLanguage: [],
        getTypes: [],
        getSupportFunctions: [],
      },
      {
        node_info: {
          catalog: {},
          connected: true,
          user_id: 1,
          user_name: 'postgres',
          version: 130005,
          server: {
            host: '127.0.0.1',
            port: 5432,

            server_type: 'ppas',
            user: {
              id: 10,
              name: 'postgres',
              is_superuser: true,
              can_create_role: true,
              can_create_db: true,
            },
          },
        },
      },
      {

        type: 'function',
      },
      {
        funcowner: 'postgres',
        lanname: 'edbspl',
      }
    );

    let initData = ()=>Promise.resolve({
      sysfunc: true,
      type: 'procedure',
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

  it('probin visible', ()=>{
    let editable = _.find(schemaObj.fields, (f)=>f.id=='probin').visible;
    let status = editable({lanname: 'c'});
    expect(status).toBe(true);
  });

  it('prosrc_c visible', ()=>{
    let visibleData = _.find(schemaObj.fields, (f)=>f.id=='prosrc_c').visible;
    let status = visibleData({lanname: 'c'});
    expect(status).toBe(true);
  });

  it('prosrc visible', ()=>{
    let visibleData = _.find(schemaObj.fields, (f)=>f.id=='prosrc').visible;
    let status = visibleData({lanname: 'c'});
    expect(status).toBe(false);
  });

  it('prorows readonly', ()=>{
    let readOnly = _.find(schemaObj.fields, (f)=>f.id=='prorows').readonly;
    let status = readOnly({proretset: true});
    expect(status).toBe(false);
  });

  it('prorettypename validate', () => {
    let state = {lanname: 'c', prorettypename: null};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prorettypename', 'Return type cannot be empty.');
  });

  it('probin validate', () => {
    let state = { lanname: 'c', prorettypename: 'char' }; 
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('probin', 'Object File cannot be empty.');
  });

  it('probin validate', () => {
    let state = { lanname: 'c', probin: 'test1', prorettypename: 'char'}; 
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('probin', null);
  });

  it('prosrc_c validate', () => {
    let state = { lanname: 'c',  probin : '$libdir/', prorettypename: 'char'};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc_c', 'Link Symbol cannot be empty.');
  });

  it('prosrc_c validate', () => {
    let state = { lanname: 'c',  probin : '$libdir/', prosrc_c: 'test1', prorettypename: 'char'};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc_c', null);
  });

  it('validate', ()=>{
    let state = {prorettypename: 'char'};
    let setError = jasmine.createSpy('setError');
    state.prosrc = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', 'Code cannot be empty.');

    state.prosrc = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', null);
  });

});

