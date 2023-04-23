/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../pgadmin/static/js/SchemaView';
import pgWindow from 'sources/window';
import fakePgAdmin from './fake_pgadmin';
import Theme from 'sources/Theme';

export let getEditView = (schemaObj, getInitData)=> {
  return <Theme>
    <SchemaView
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
    />
  </Theme>;
};

export let getCreateView = (schemaObj)=> {
  return <Theme>
    <SchemaView
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
    />
  </Theme>;
};

export let getPropertiesView = (schemaObj, getInitData)=> {
  return <Theme>
    <SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{/*This is intentional (SonarQube)*/}}
      onEdit={()=>{/*This is intentional (SonarQube)*/}}
    />
  </Theme>;
};

export let genericBeforeEach = ()=> {
  jasmineEnzyme();
  /* messages used by validators */
  pgAdmin.Browser = {
    ...pgAdmin.Browser,
    ...fakePgAdmin.Browser
  };
  pgWindow.pgAdmin = pgAdmin;
};
