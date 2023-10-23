/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import PgaJobStepSchema from '../../../pgadmin/browser/server_groups/servers/pgagent/steps/static/js/pga_jobstep.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PgaJobStepSchema', ()=>{

  let schemaObj = new PgaJobStepSchema(
    {
      databases: ()=>[],
    },
    [],
    {
      jstdbname: 'postgres',
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

    state.name = 'my_step';
    state.jstkind = true;
    state.jstconntype = true;
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstdbname', 'Please select a database.');

    state.jstdbname = 'postgres';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstdbname', null);

    state.jstconntype = false;
    state.jstconnstr = null;
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a connection string.');

    state.jstconnstr = '**!!';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a valid connection string.');

    state.jstconnstr = 'host:\'192.168.1.7\'';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a valid connection string.');

    state.jstconnstr = 'host:\'192.168.1.7\'';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a valid connection string.');

    state.jstconnstr = 'hostaddrtest=\'192.168.1.7\'';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Invalid parameter in the connection string - hostaddrtest.');

    state.jstconnstr = 'host=\'192.168.1.7\' port=5432';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', null);

    state.jstcode = null;
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstcode', 'Please specify code to execute.');

    state.jstcode = 'PERFORM 1;';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstcode', null);

    state.jstonerror = null;
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstonerror', 'Please select valid on error option.');

    state.jstonerror = 'f';
    setError.mockClear();
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstonerror', null);
  });
});

