/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import PackageSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/static/js/package.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import { initializeSchemaWithData } from './utils';

describe('PackageSchema', ()=>{

  const createSchemaObject = () => new PackageSchema(
    (privileges) => getNodePrivilegeRoleSchema(
      {}, {server: {user: {name: 'postgres'}}}, {}, privileges
    ),
    {
      schemas:() => [],
      node_info: {'schema': []}
    },
  );
  let packageSchemaObj = createSchemaObject(); 
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObject());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('pkgheadsrc depChange', ()=>{

    let state = {
      pkgheadsrc: 'changed text'
    };
    packageSchemaObj.warningText = null;

    initializeSchemaWithData(packageSchemaObj, { oid: '123' });

    let actionObj = {
      oldState: {
        pkgheadsrc: 'original text'
      }
    };

    let depChange = _.find(packageSchemaObj.fields, (f)=>f.id=='pkgheadsrc').depChange;
    depChange(state, {}, {}, actionObj);
    expect(packageSchemaObj.warningText).not.toBeNull();
  });

  it('pkgbodysrc depChange', ()=>{

    let state = {
      pkgheadsrc: 'changed text'
    };
    packageSchemaObj.warningText = null;
    initializeSchemaWithData(packageSchemaObj, { oid: '123' });
    let actionObj = {
      oldState: {
        pkgbodysrc: 'original text'
      }
    };

    let depChange = _.find(packageSchemaObj.fields, (f)=>f.id=='pkgbodysrc').depChange;
    depChange(state, {}, {}, actionObj);
    expect(packageSchemaObj.warningText).not.toBeNull();
  });

  it('package validate', () => {
    let state = {
      pkgheadsrc: undefined
    };
    let setError = jest.fn();

    packageSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('pkgheadsrc', 'Header cannot be empty.');

    state.pkgheadsrc = 'changed';
    let validate = packageSchemaObj.validate(state, setError);
    expect(validate).toBe(null);
  });
});

