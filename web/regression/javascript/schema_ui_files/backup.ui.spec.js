/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BackupSchema, {getSectionSchema, getTypeObjSchema, getSaveOptSchema, getQueryOptionSchema, getDisabledOptionSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backup.ui';


describe('BackupSchema', ()=>{
  let mount;
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });
  let backupSchemaObj = new BackupSchema(
    ()=> getSectionSchema(),
    ()=> getTypeObjSchema(),
    ()=> getSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getQueryOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getDisabledOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    pgAdmin.pgBrowser,
    'backup_objects'
  );

  it('create object backup', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={backupSchemaObj}
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


  let backupServerSchemaObj = new BackupSchema(
    ()=> getSectionSchema(),
    ()=> getTypeObjSchema(),
    ()=> getSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getQueryOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getDisabledOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    {serverInfo: {}},
    'server'
  );

  it('create server backup', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={backupServerSchemaObj}
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
});

