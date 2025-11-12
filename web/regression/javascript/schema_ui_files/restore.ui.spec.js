/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL License
//
//////////////////////////////////////////////////////////////


import pgAdmin from 'sources/pgadmin';
import RestoreSchema, {getRestoreSaveOptSchema, getRestoreDisableOptionSchema, getRestoreMiscellaneousSchema, getRestoreTypeObjSchema, getRestoreSectionSchema} from '../../../pgadmin/tools/restore/static/js/restore.ui';
import {getCreateView} from '../genericFunctions';

describe('RestoreSchema', ()=>{

  const createSchemaObj = () => new RestoreSchema(
    ()=>getRestoreSectionSchema({selectedNodeType: 'table'}),
    ()=>getRestoreTypeObjSchema({selectedNodeType: 'table'}),
    ()=>getRestoreSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=>getRestoreDisableOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=>getRestoreMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
      nodeType: '',
    },
    {server: {version: 11000}},
    pgAdmin.pgBrowser
  );

  it('restore dialog', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('restore validate', () => {
    let restoreSchemaObj = createSchemaObj();
    let state = { file: undefined }; //validating for empty file
    let setError = jest.fn();

    restoreSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('file', 'Please provide a filename.');

    state.file = '/home/dir/restore.sql'; //validating for valid file name
    restoreSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('file', null);
  });
});
