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
import {act, screen, waitFor} from '@testing-library/react';

describe('AzureCredSchema', ()=>{
  const eventBus = {fireEvent: jest.fn()};

  beforeEach(()=>{
    genericBeforeEach();
    eventBus.fireEvent.mockClear();
  });

  const getAuthButton = ()=>screen.getByRole('button', {
    name: 'Click here to authenticate yourself to Microsoft Azure'});

  const renderSchema = async (schemaObj)=>{
    const view = await getCreateView(schemaObj);
    // The dialog moves the focus to its first input (the authentication type
    // toggle) 200ms after it opens. Wait for that to happen, otherwise on a
    // slow machine the focus moves part way through typing the tenant id and
    // the remaining keystrokes go to the toggle instead.
    await waitFor(()=>{
      expect(screen.getByRole('button', {name: 'Interactive Browser'}))
        .toHaveFocus();
    });
    return view;
  };

  const clickAuthButton = async (user)=>{
    await user.click(getAuthButton());
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

    const {ctrl, user} = await renderSchema(schemaObj);
    const tenantInput = ctrl.container.querySelector(
      '[name="azure_tenant_id"]');
    await user.type(tenantInput, 'tenant-1');
    expect(tenantInput).toHaveValue('tenant-1');
    await clickAuthButton(user);

    expect(authenticateAzure).toHaveBeenCalledWith(
      'interactive_browser_credential', 'tenant-1');
    expect(getAuthCode).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('TESTCODE1')).toBeInTheDocument();
  });

  it('keeps the button disabled until authentication settles', async ()=>{
    let settle;
    const authenticateAzure = jest.fn(()=>new Promise((resolve)=>{
      settle = resolve;
    }));
    const getAuthCode = jest.fn(()=>Promise.resolve({
      data: {data: {user_code: 'TESTCODE1'}},
    }));
    const schemaObj = new AzureCredSchema(eventBus, {
      authenticateAzure, getAuthCode,
    }, {});

    const {ctrl, user} = await renderSchema(schemaObj);
    await user.type(
      ctrl.container.querySelector('[name="azure_tenant_id"]'),
      'tenant-1');
    await clickAuthButton(user);

    // The device code has arrived but the server is still waiting for the
    // user, so a second attempt must not be possible yet.
    expect(await screen.findByText('TESTCODE1')).toBeInTheDocument();
    expect(getAuthButton()).toBeDisabled();

    // A failed attempt lets the user try again.
    await act(async ()=>{
      settle(false);
    });
    expect(getAuthButton()).toBeEnabled();
    expect(screen.queryByText('TESTCODE1')).not.toBeInTheDocument();
  });

  it('requires authentication again when the tenant id changes', async ()=>{
    const authenticateAzure = jest.fn(()=>Promise.resolve(true));
    const getAuthCode = jest.fn(()=>new Promise(()=>{}));
    const schemaObj = new AzureCredSchema(eventBus, {
      authenticateAzure, getAuthCode,
    }, {});

    const {ctrl, user} = await renderSchema(schemaObj);
    const tenantInput = ctrl.container.querySelector(
      '[name="azure_tenant_id"]');
    await user.type(tenantInput, 'tenant-1');
    await clickAuthButton(user);
    expect(getAuthButton()).toBeDisabled();

    await user.type(tenantInput, '2');
    expect(getAuthButton()).toBeEnabled();
  });

  it('does not wait for a device code when using the Azure CLI', async ()=>{
    const authenticateAzure = jest.fn(()=>Promise.resolve(true));
    const getAuthCode = jest.fn(()=>Promise.resolve({
      data: {data: {user_code: 'TESTCODE1'}},
    }));
    const schemaObj = new AzureCredSchema(eventBus, {
      authenticateAzure, getAuthCode,
    }, {});

    const {user} = await renderSchema(schemaObj);
    await user.click(screen.getByRole('button', {name: 'Azure CLI'}));
    await clickAuthButton(user);

    expect(authenticateAzure).toHaveBeenCalledWith(
      'azure_cli_credential', '');
    expect(getAuthCode).not.toHaveBeenCalled();
  });
});
