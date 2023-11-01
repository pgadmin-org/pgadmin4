/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CastSchema from '../../../pgadmin/browser/server_groups/servers/databases/casts/static/js/cast.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';


describe('CastSchema', ()=>{

  let schemaObj = new CastSchema(
    {
      getTypeOptions: ()=>[],
      getFuncOptions: ()=>[],
    },
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

  it('srctyp depChange', ()=>{
    let depChange = _.find(schemaObj.fields, (f)=>f.id=='srctyp').depChange;
    let status = depChange({srctyp: 'abc', trgtyp: 'abc'});
    expect(status).toEqual('abc->abc');
  });

  it('trgtyp depChange', ()=>{
    let depChange = _.find(schemaObj.fields, (f)=>f.id=='trgtyp').depChange;
    let status = depChange({srctyp: 'abc', trgtyp: 'abc'});
    expect(status).toEqual('abc->abc');
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.srctyp = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('srctyp', 'Source type must be selected.');

    state.srctyp = 'bigint';
    state.trgtyp = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('trgtyp', 'Target type must be selected.');
  });
});

