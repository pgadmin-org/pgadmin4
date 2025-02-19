/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../pgadmin/static/js/SchemaView';
import pgWindow from 'sources/window';
import fakePgAdmin from './fake_pgadmin';
import Theme from '../../pgadmin/static/js/Theme';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PgAdminProvider } from '../../pgadmin/static/js/PgAdminProvider';

export function withBrowser(WrappedComp) {
  /* eslint-disable react/display-name */
  return (props)=>{
    return <Theme>
      <PgAdminProvider value={fakePgAdmin}>
        <WrappedComp {...props}/>
      </PgAdminProvider>
    </Theme>;
  };
}

const SchemaViewWithBrowser = withBrowser(SchemaView);

export const getEditView = async (schemaObj, getInitData)=> {
  await act(async ()=>{
    return render(<SchemaViewWithBrowser
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
    />);
  });
};

export const getCreateView = async (schemaObj)=> {
  let ctrl;
  const user = userEvent.setup();
  await act(async ()=>{
    ctrl = render(<SchemaViewWithBrowser
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
    />);
  });
  return {ctrl, user};
};

export const getPropertiesView = async (schemaObj, getInitData)=> {
  await act(async ()=>{
    return render(<SchemaViewWithBrowser
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{/*This is intentional (SonarQube)*/}}
      onEdit={()=>{/*This is intentional (SonarQube)*/}}
    />);
  });
};

export const addNewDatagridRow = async (user, ctrl)=>{
  await user.click(ctrl.container.querySelector('[data-test="add-row"] button'));
};

export const genericBeforeEach = ()=> {
  pgWindow.pgAdmin = pgAdmin;
};
