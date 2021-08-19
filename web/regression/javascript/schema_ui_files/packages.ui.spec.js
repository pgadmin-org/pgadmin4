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
import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import PackageSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/static/js/package.ui';


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
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={packageSchemaObj}
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
      disableDialogHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={packageSchemaObj}
      getInitData={getInitData}
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
      disableDialogHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={packageSchemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
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

