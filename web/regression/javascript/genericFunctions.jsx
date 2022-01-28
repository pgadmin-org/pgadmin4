/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import pgAdmin from 'sources/pgadmin';
import {messages} from './fake_messages';
import SchemaView from '../../pgadmin/static/js/SchemaView';

export let getEditView = (schemaObj, getInitData)=> {
  return <SchemaView
    formType='dialog'
    schema={schemaObj}
    getInitData={getInitData}
    viewHelperProps={{
      mode: 'edit',
    }}
    onSave={()=>{/*This is intentional (SonarQube)*/}}
    onClose={()=>{/*This is intentional (SonarQube)*/}}
    onHelp={()=>{/*This is intentional (SonarQube)*/}}
    onEdit={()=>{/*This is intentional (SonarQube)*/}}
    onDataChange={()=>{/*This is intentional (SonarQube)*/}}
    confirmOnCloseReset={false}
    hasSQL={false}
    disableSqlHelp={false}
    disableDialogHelp={false}
  />;
};

export let getCreateView = (schemaObj)=> {
  return <SchemaView
    formType='dialog'
    schema={schemaObj}
    viewHelperProps={{
      mode: 'create',
    }}
    onSave={()=>{/*This is intentional (SonarQube)*/}}
    onClose={()=>{/*This is intentional (SonarQube)*/}}
    onHelp={()=>{/*This is intentional (SonarQube)*/}}
    onEdit={()=>{/*This is intentional (SonarQube)*/}}
    onDataChange={()=>{/*This is intentional (SonarQube)*/}}
    confirmOnCloseReset={false}
    hasSQL={false}
    disableSqlHelp={false}
    disableDialogHelp={false}
  />;
};

export let getPropertiesView = (schemaObj, getInitData)=> {
  return <SchemaView
    formType='tab'
    schema={schemaObj}
    getInitData={getInitData}
    viewHelperProps={{
      mode: 'properties',
    }}
    onHelp={()=>{/*This is intentional (SonarQube)*/}}
    onEdit={()=>{/*This is intentional (SonarQube)*/}}
  />;
};

export let genericBeforeEach = ()=> {
  jasmineEnzyme();
  /* messages used by validators */
  pgAdmin.Browser = pgAdmin.Browser || {};
  pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
  pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
};
