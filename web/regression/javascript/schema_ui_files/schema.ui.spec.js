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
import {getNodePrivilegeRoleSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import PGSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/static/js/schema.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PGSchema', ()=>{
  let mount;
  let schemaObj = new PGSchema(
    ()=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    {
      roles:() => [],
      namespaceowner: '',
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
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('schema validate', () => {
    let state = { name: 'abc' };
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('namespaceowner', 'Owner cannot be empty.');

    state.namespaceowner = 'postgres';
    let validate = schemaObj.validate(state, setError);
    expect(validate).toBe(null);
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });
});

