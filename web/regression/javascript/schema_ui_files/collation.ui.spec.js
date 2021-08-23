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
import { messages } from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import CollationSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/collations/static/js/collation.ui';


describe('CollationsSchema', () => {
  let mount;
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

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(() => {
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', () => {
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={() => { }}
      onClose={() => { }}
      onHelp={() => { }}
      onEdit={() => { }}
      onDataChange={() => { }}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('edit', () => {
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={() => { }}
      onClose={() => { }}
      onHelp={() => { }}
      onEdit={() => { }}
      onDataChange={() => { }}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('properties', () => {
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={() => { }}
      onEdit={() => { }}
    />);
  });

  it('validate', () => {
    let state = {};
    let setError = jasmine.createSpy('setError');

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
    expect(schemaObj.disableFields(state)).toBeTrue();

    state.name = 'test';
    state.copy_collation = 'copy_collation';
    state.locale = null;
    expect(schemaObj.disableFields(state)).toBeTrue();

    state.name = 'test';
    state.copy_collation = null;
    state.locale = null;
    expect(schemaObj.disableFields(state)).toBeFalse();

  });
});

