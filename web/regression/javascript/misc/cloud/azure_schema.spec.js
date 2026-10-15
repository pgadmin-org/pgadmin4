/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {AzureCredSchema} from '../../../../pgadmin/misc/cloud/static/js/azure_schema.ui';
import {genericBeforeEach, getCreateView} from '../../genericFunctions';
import {act, screen} from '@testing-library/react';

describe('AzureCredSchema', ()=>{
  const eventBus = {fireEvent: jest.fn()};

  beforeEach(()=>{
    genericBeforeEach();
    eventBus.fireEvent.mockClear();
  });

  const clickAuthButton = async (user)=>{
    await user.click(screen.getByRole('button', {
      name: 'Click here to authenticate yourself to Microsoft Azure'}));
    // The click handler defers its work with setTimeout().
    await act(async ()=>{
      await new Promise((resolve)=>setTimeout(resolve, 10));
    });
  };

  it('shows the device code when using the interactive browser', async ()=>{
    // Authentication only completes once the user has entered the code.
    const authenticateAzure = jest.fn(()=>new Promise(()=>{}));
    const getAuthCode = jest.fn(()=>Promise.resolve({
      data: {data: {user_code: 'TESTCODE1'}},
    }));
    const schemaObj = new AzureCredSchema(eventBus, {
      authenticateAzure, getAuthCode,
    }, {});

    const {ctrl, user} = await getCreateView(schemaObj);
    await user.type(
      ctrl.container.querySelector('[name="azure_tenant_id"]'),
      'tenant-1');
    await clickAuthButton(user);

    expect(authenticateAzure).toHaveBeenCalledWith(
      'interactive_browser_credential', 'tenant-1');
    expect(getAuthCode).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('TESTCODE1')).toBeInTheDocument();
  });

  it('does not wait for a device code when using the Azure CLI', async ()=>{
    const authenticateAzure = jest.fn(()=>Promise.resolve(true));
    const getAuthCode = jest.fn(()=>Promise.resolve({
      data: {data: {user_code: 'TESTCODE1'}},
    }));
    const schemaObj = new AzureCredSchema(eventBus, {
      authenticateAzure, getAuthCode,
    }, {});

    const {user} = await getCreateView(schemaObj);
    await user.click(screen.getByRole('button', {name: 'Azure CLI'}));
    await clickAuthButton(user);

    expect(authenticateAzure).toHaveBeenCalledWith(
      'azure_cli_credential', '');
    expect(getAuthCode).not.toHaveBeenCalled();
  });
});
