/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BackupSchema, {getSectionSchema, getTypeObjSchema, getSaveOptSchema, getDisabledOptionSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backup.ui';
import { getCreateView, withBrowser } from '../genericFunctions';
import { act, render } from '@testing-library/react';


describe('BackupSchema', ()=>{
  let backupSchemaObj = new BackupSchema(
    ()=> getSectionSchema(),
    ()=> getTypeObjSchema(),
    ()=> getSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getDisabledOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    pgAdmin.pgBrowser,
    'backup_objects',
    []
  );

  it('create object backup', async ()=>{
    await getCreateView(backupSchemaObj);
  });


  let backupSelectedSchemaObj = new BackupSchema(
    ()=> getSectionSchema(),
    ()=> getTypeObjSchema(),
    ()=> getSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getDisabledOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    pgAdmin.pgBrowser,
    'backup_objects',
    [{'id': 'public','name': 'public','icon': 'icon-schema', 'children': [{'id': 'public_table','name': 'table','icon': 'icon-coll-table','children': [{'id': 'public_test','name': 'test','icon': 'icon-table','schema': 'public','type': 'table','_name': 'public.test'}],'type': 'table','is_collection': true}],'is_schema': true}]
  );

  it('create selected object backup', async ()=>{
    const WithBrowser = withBrowser(SchemaView);
    await act(async ()=>{
      await render(<WithBrowser
        formType='dialog'
        schema={backupSelectedSchemaObj}
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
      );
    });
  });


  let backupServerSchemaObj = new BackupSchema(
    ()=> getSectionSchema(),
    ()=> getTypeObjSchema(),
    ()=> getSaveOptSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getDisabledOptionSchema({nodeInfo: {server: {version: 11000}}}),
    ()=> getMiscellaneousSchema({nodeInfo: {server: {version: 11000}}}),
    {
      role: ()=>[],
      encoding: ()=>[],
    },
    {server: {version: 11000}},
    {serverInfo: {}},
    'server',
    []
  );

  it('create server backup', async ()=>{
    await getCreateView(backupServerSchemaObj);
  });
});

