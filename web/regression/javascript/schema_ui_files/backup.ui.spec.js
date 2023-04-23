/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BackupSchema, {getSectionSchema, getTypeObjSchema, getSaveOptSchema, getQueryOptionSchema, getDisabledOptionSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backup.ui';
import Theme from '../../../pgadmin/static/js/Theme';


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
    mount(<Theme>
      <SchemaView
        formType='dialog'
        schema={backupSchemaObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{/*This is intentional (SonarQube)*/}}
        onClose={()=>{/*This is intentional (SonarQube)*/}}
        onHelp={()=>{/*This is intentional (SonarQube)*/}}
        onDataChange={()=>{/*This is intentional (SonarQube)*/}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />
    </Theme>);
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
    mount(<Theme>
      <SchemaView
        formType='dialog'
        schema={backupServerSchemaObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{/*This is intentional (SonarQube)*/}}
        onClose={()=>{/*This is intentional (SonarQube)*/}}
        onHelp={()=>{/*This is intentional (SonarQube)*/}}
        onDataChange={()=>{/*This is intentional (SonarQube)*/}}
        confirmOnCloseReset={false}
        hasSQL={false}
        disableSqlHelp={false}
        disableDialogHelp={false}
      />
    </Theme>);
  });
});

