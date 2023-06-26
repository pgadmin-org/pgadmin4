/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CollationSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/collations/static/js/collation.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('CollationsSchema', () => {

  let schemaObj = new CollationSchema(
    {
      rolesList: () => [],
      schemaList: () => [],
      collationsList: () => []
    },
    {
      owner: 'postgres',
      schema: ''
    }
  );
  let getInitData = () => Promise.resolve({});



  beforeEach(() => {
    genericBeforeEach();
  });

  it('create', () => {
    getCreateView(schemaObj);
  });

  it('edit', () => {
    getEditView(schemaObj, getInitData);
  });

  it('properties', () => {
    getPropertiesView(schemaObj, getInitData);
  });

  it('validate', () => {
    let state = {};
    let setError = jest.fn();

    state.name = null;
    state.locale = 'locale';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('name', 'Name cannot be empty.');

    state.name = 'test';
    state.copy_collation = null;
    state.lc_type = null;
    state.lc_collate = null;
    state.locale = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('copy_collation', 'Definition incomplete. Please provide Locale OR Copy Collation OR LC_TYPE/LC_COLLATE.');
  });

  it('disableFields',() => {
    let state = {};

    state.name = 'test';
    state.locale = 'locale';
    expect(schemaObj.disableFields(state)).toBe(true);

    state.name = 'test';
    state.copy_collation = 'copy_collation';
    state.locale = null;
    expect(schemaObj.disableFields(state)).toBe(true);

    state.name = 'test';
    state.copy_collation = null;
    state.locale = null;
    expect(schemaObj.disableFields(state)).toBe(false);

  });
});

