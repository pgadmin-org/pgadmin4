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
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import DomainSchema, { DomainConstSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/domains/static/js/domain.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('DomainSchema', ()=>{
  let mount;
  let schemaObj = new DomainSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      basetype: ()=>['character varying', 'numeric'],
      collation: ()=>[],
    },
    [],
    {
      owner: 'postgres',
      schema: 'public',
      basensp: 'public',
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

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });
});

/* Used to check collection mode */
class MockSchema extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [{
      id: 'constraint', label: '', type: 'collection',
      schema: new DomainConstSchema(),
      editable: false,
      group: 'Constraints', mode: ['edit', 'create'],
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      node: 'role',
    }];
  }
}

describe('DomainConstSchema', ()=>{
  let mount;
  let schemaObj = new MockSchema();
  let domainConstObj = new DomainConstSchema();
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
    let ctrl = mount(getCreateView(schemaObj));

    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    state.conname = undefined;
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('conname', 'Constraint Name cannot be empty.');

    state.conname = 'my_syn';
    state.consrc = undefined;
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('consrc', 'Constraint Check cannot be empty.');

    state.consrc = 'public';
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('consrc', null);
  });
});
