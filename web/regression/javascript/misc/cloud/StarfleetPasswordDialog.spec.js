/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import Theme from '../../../../pgadmin/static/js/Theme';
import {
  StarfleetPasswordContent,
} from '../../../../pgadmin/misc/cloud/static/js/StarfleetPasswordDialog';

const SAVE_URL = '/misc/cloud/starfleet/save_password/7';

function makeNode(overrides={}) {
  return {
    sid: 7,
    host: 'db.example.com',
    username: 'admin',
    starfleet: true,
    starfleet_password: 'Not-A-Real-Password-1',
    allow_save_password: true,
    ...overrides,
  };
}

function renderDialog(node, onClose=jest.fn()) {
  render(<Theme><StarfleetPasswordContent node={node} onClose={onClose} /></Theme>);
  return onClose;
}

describe('StarfleetPasswordContent', ()=>{
  let networkMock;

  beforeEach(()=>{
    networkMock = new MockAdapter(axios);
  });

  afterEach(()=>{
    networkMock.restore();
  });

  it('shows the host, username and password with copy and save buttons', ()=>{
    renderDialog(makeNode());
    expect(screen.getByText('db.example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Not-A-Real-Password-1')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Copy'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save password'})).toBeInTheDocument();
  });

  it('posts the password to the save route and disables Save on success', async ()=>{
    networkMock.onPost(SAVE_URL).reply(200, {success: 1});
    renderDialog(makeNode());
    await userEvent.click(screen.getByRole('button', {name: 'Save password'}));
    await waitFor(()=>expect(networkMock.history.post.length).toBe(1));
    expect(JSON.parse(networkMock.history.post[0].data)).toEqual({password: 'Not-A-Real-Password-1'});
    expect(await screen.findByText('The password has been saved with the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save password'})).toBeDisabled();
  });

  it('shows the server error message when saving fails', async ()=>{
    networkMock.onPost(SAVE_URL).reply(403, {success: 0, errormsg: 'Saving is disabled.'}, {'content-type': 'application/json'});
    renderDialog(makeNode());
    await userEvent.click(screen.getByRole('button', {name: 'Save password'}));
    expect(await screen.findByText('Saving is disabled.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save password'})).not.toBeDisabled();
  });

  it('has no Save button when saving is not allowed', ()=>{
    renderDialog(makeNode({allow_save_password: false}));
    expect(screen.queryByRole('button', {name: 'Save password'})).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Not-A-Real-Password-1')).toBeInTheDocument();
  });

  it('explains the password is unavailable when it is null', ()=>{
    renderDialog(makeNode({starfleet_password: null}));
    expect(screen.getByText(/Starfleet console/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Save password'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Copy'})).not.toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', async ()=>{
    const onClose = renderDialog(makeNode());
    await userEvent.click(screen.getByRole('button', {name: 'Close'}));
    expect(onClose).toHaveBeenCalled();
  });
});
