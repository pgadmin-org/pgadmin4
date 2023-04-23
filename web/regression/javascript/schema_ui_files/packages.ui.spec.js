/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import PackageSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/static/js/package.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PackageSchema', ()=>{
  let mount;
  let packageSchemaObj = new PackageSchema(
    (privileges)=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}, privileges),
    {
      schemas:() => [],
      node_info: {'schema': []}
    },
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
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(packageSchemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(packageSchemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(packageSchemaObj, getInitData));
  });

  it('pkgheadsrc depChange', ()=>{

    let state = {
      pkgheadsrc: 'changed text'
    };
    packageSchemaObj.warningText = null;
    packageSchemaObj._origData = {
      oid: '123'
    };
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
    packageSchemaObj._origData = {
      oid: '123'
    };
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
    let setError = jasmine.createSpy('setError');

    packageSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('pkgheadsrc', 'Header cannot be empty.');

    state.pkgheadsrc = 'changed';
    let validate = packageSchemaObj.validate(state, setError);
    expect(validate).toBe(null);
  });
});

