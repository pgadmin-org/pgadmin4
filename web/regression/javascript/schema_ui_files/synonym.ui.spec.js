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
import SynonymSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/synonyms/static/js/synonym.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('SynonymSchema', ()=>{
  let mount;
  let schemaObj = new SynonymSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      synobjschema: ()=>[],
      getTargetObjectOptions: ()=>[],
    },
    [],
    {
      owner: 'postgres',
      schema: 'public',
      synobjschema: 'public',
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

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    state.name = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('name', '\'Name\' cannot be empty.');

    state.name = 'my_syn';
    state.synobjschema = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('synobjschema', '\'Target schema\' cannot be empty.');

    state.synobjschema = 'public';
    state.synobjname = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('synobjname', '\'Target object\' cannot be empty.');
  });
});

