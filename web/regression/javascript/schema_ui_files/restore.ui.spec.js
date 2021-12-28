/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL License
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import RestoreSchema, {getRestoreSaveOptSchema, getRestoreQueryOptionSchema, getRestoreDisableOptionSchema, getRestoreMiscellaneousSchema, getRestoreTypeObjSchema, getRestoreSectionSchema} from '../../../pgadmin/tools/restore/static/js/restore.ui';

describe('RestoreSchema', ()=>{
  let mount;
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });
  let restoreSchemaObj = new RestoreSchema(
    ()=>getRestoreSectionSchema({selectedNodeType: 'table'}),
    ()=>getRestoreTypeObjSchema({selectedNodeType: 'table'}),
    ()=>getRestoreSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=>getRestoreQueryOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=>getRestoreDisableOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=>getRestoreMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    pgAdmin.pgBrowser
  );

  it('restore dialog', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={restoreSchemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('restore validate', () => {
    let state = { file: undefined }; //validating for empty file
    let setError = jasmine.createSpy('setError');

    restoreSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('file', 'Please provide a filename.');

    state.file = '/home/dir/restore.sql'; //validating for valid file name
    restoreSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('file', null);
  });
});
