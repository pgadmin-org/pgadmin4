/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

// The dialog content pulls in a large dependency tree that this test does not
// need; only the props connectServer passes to it are under test here.
jest.mock('../../../pgadmin/static/js/Dialogs/ConnectServerContent', () => ({
  __esModule: true,
  default: () => null,
}));

import url_for from 'sources/url_for';
import { connectServer, ensureServerConnected } from '../../../pgadmin/tools/sqleditor/static/js/components/connectServer';

/* Captures the props of each password prompt raised, so that a test can drive
 * the prompt by calling onOK or closeModal on it. */
function createFakeModal() {
  const prompts = [];
  return {
    prompts,
    showModal: (_title, content)=>{
      prompts.push(content(()=>{/* closeModal */}).props);
    },
  };
}

const passwordFormData = new Map([['password', 'secret']]);

describe('connectServer', ()=>{
  it('invokes the connect callback and raises no prompt when the connection succeeds', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {connected: true}}});
    const modal = createFakeModal();
    const connectCallback = jest.fn();
    const promptCallback = jest.fn();

    await connectServer(api, modal, 1, 'postgres', passwordFormData, connectCallback,
      jest.fn(), promptCallback);

    expect(connectCallback).toHaveBeenCalledWith({connected: true});
    expect(modal.prompts).toHaveLength(0);
    expect(promptCallback).not.toHaveBeenCalled();
  });

  it('builds the connect URL from the server id alone', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {connected: true}}});
    url_for.mockClear();

    await connectServer(api, createFakeModal(), 1, 'postgres', passwordFormData);

    /* The client-side url_for() drops any key that is not a placeholder in
     * the route, so a user name passed here would never reach the backend
     * (issue #10418). */
    expect(url_for).toHaveBeenCalledWith('sqleditor.connect_server', {'sid': 1});
    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      url: '/mock/sqleditor.connect_server',
    }));
  });

  it('pauses and resumes the loading state around a password retry', async ()=>{
    const api = jest.fn()
      .mockRejectedValueOnce({response: {data: {result: 'need password'}}})
      .mockResolvedValueOnce({data: {data: {connected: true}}});
    const modal = createFakeModal();
    const connectCallback = jest.fn();
    const promptCallback = jest.fn();

    await connectServer(api, modal, 1, 'postgres', passwordFormData, connectCallback,
      jest.fn(), promptCallback);

    /* The spinner must stop whilst the prompt is open, otherwise it animates
     * indefinitely while the tab sits idle awaiting input (issue #10386). */
    expect(promptCallback).toHaveBeenCalledTimes(1);
    expect(promptCallback).toHaveBeenLastCalledWith(false);
    expect(modal.prompts).toHaveLength(1);
    expect(modal.prompts[0].data).toBe('need password');

    await modal.prompts[0].onOK(passwordFormData);

    expect(promptCallback).toHaveBeenCalledTimes(2);
    expect(promptCallback).toHaveBeenLastCalledWith(true);
    expect(connectCallback).toHaveBeenCalledWith({connected: true});
  });

  it('invokes the cancel callback when the prompt is dismissed', async ()=>{
    const api = jest.fn().mockRejectedValue({response: {data: {result: 'need password'}}});
    const modal = createFakeModal();
    const connectCallback = jest.fn();
    const cancelCallback = jest.fn();
    const promptCallback = jest.fn();

    await connectServer(api, modal, 1, 'postgres', passwordFormData, connectCallback,
      cancelCallback, promptCallback);

    modal.prompts[0].closeModal();

    expect(cancelCallback).toHaveBeenCalledTimes(1);
    expect(connectCallback).not.toHaveBeenCalled();
    expect(promptCallback).toHaveBeenLastCalledWith(false);
  });

  it('tolerates the optional callbacks being omitted', async ()=>{
    const api = jest.fn().mockRejectedValue({response: {data: {result: 'need password'}}});
    const modal = createFakeModal();

    await connectServer(api, modal, 1, 'postgres', passwordFormData);

    expect(()=>modal.prompts[0].closeModal()).not.toThrow();
  });
});

describe('ensureServerConnected', ()=>{
  it('connects the server itself and resolves without prompting', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {connected: true}}});
    const modal = createFakeModal();
    url_for.mockClear();

    await expect(ensureServerConnected(api, modal, 1)).resolves.toEqual({connected: true});

    /* Changing the Query Tool connection must connect the server, otherwise a
     * disconnected server stays disconnected in the Object Explorer whilst the
     * Query Tool reconnects (issue #8144). */
    expect(url_for).toHaveBeenCalledWith('sqleditor.connect_server', {'sid': 1});
    expect(modal.prompts).toHaveLength(0);
  });

  it('resolves once the password prompt is answered', async ()=>{
    const api = jest.fn()
      .mockRejectedValueOnce({response: {status: 428, data: {result: 'need password'}}})
      .mockResolvedValueOnce({data: {data: {connected: true}}});
    const modal = createFakeModal();
    const promptCallback = jest.fn();

    const result = ensureServerConnected(api, modal, 1, promptCallback);
    await new Promise(process.nextTick);
    expect(modal.prompts).toHaveLength(1);
    expect(promptCallback).toHaveBeenLastCalledWith(false);

    modal.prompts[0].onOK(passwordFormData);

    await expect(result).resolves.toEqual({connected: true});
    expect(promptCallback).toHaveBeenLastCalledWith(true);
    expect(api).toHaveBeenLastCalledWith(expect.objectContaining({data: {password: 'secret'}}));
  });

  it('rejects with a cancelled error when the prompt is dismissed', async ()=>{
    const api = jest.fn().mockRejectedValue({response: {status: 428, data: {result: 'need password'}}});
    const modal = createFakeModal();

    const result = ensureServerConnected(api, modal, 1);
    await new Promise(process.nextTick);
    modal.prompts[0].closeModal();

    await expect(result).rejects.toMatchObject({cancelled: true});
  });

  it('prompts again when the supplied password is rejected', async ()=>{
    const api = jest.fn()
      .mockRejectedValueOnce({response: {status: 428, data: {result: 'need password'}}})
      .mockRejectedValueOnce({response: {status: 401, data: {result: 'wrong password'}}})
      .mockResolvedValueOnce({data: {data: {connected: true}}});
    const modal = createFakeModal();

    const result = ensureServerConnected(api, modal, 1);
    await new Promise(process.nextTick);
    modal.prompts[0].onOK(passwordFormData);
    await new Promise(process.nextTick);

    expect(modal.prompts).toHaveLength(2);
    expect(modal.prompts[1].data).toBe('wrong password');
    modal.prompts[1].onOK(passwordFormData);

    await expect(result).resolves.toEqual({connected: true});
  });

  it('rejects with the server error, without prompting, for other failures', async ()=>{
    const api = jest.fn().mockRejectedValue(
      {response: {status: 410, data: {errormsg: 'Could not find the required server.'}}});
    const modal = createFakeModal();

    const error = await ensureServerConnected(api, modal, 1).catch((e)=>e);

    expect(modal.prompts).toHaveLength(0);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Could not find the required server.');
    expect(error.cancelled).toBeUndefined();
  });

  it('sends no user or role unless asked to', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {}}});

    await ensureServerConnected(api, createFakeModal(), 1);

    expect(api).toHaveBeenCalledWith(expect.objectContaining({data: null}));
  });

  it('sends the user and role of the connection being switched to', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {}}});

    await ensureServerConnected(api, createFakeModal(), 1, undefined,
      {user: 'jane', role: 'reporting'});

    /* The backend only connects the server for its own user and role, so a
     * connection made as anyone else is not held up by a prompt for the
     * server's own user's password (issue #8144). */
    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      data: {user: 'jane', role: 'reporting'},
    }));
  });

  it('sends an empty role when the connection has none', async ()=>{
    const api = jest.fn().mockResolvedValue({data: {data: {}}});

    await ensureServerConnected(api, createFakeModal(), 1, undefined,
      {user: 'postgres', role: undefined});

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      data: {user: 'postgres', role: ''},
    }));
  });

  it('keeps sending the user and role after a password prompt', async ()=>{
    const api = jest.fn()
      .mockRejectedValueOnce({response: {status: 428, data: {result: 'need password'}}})
      .mockResolvedValueOnce({data: {data: {connected: true}}});
    const modal = createFakeModal();

    const result = ensureServerConnected(api, modal, 1, undefined,
      {user: 'postgres', role: ''});
    await new Promise(process.nextTick);
    modal.prompts[0].onOK(passwordFormData);

    await expect(result).resolves.toEqual({connected: true});
    expect(api).toHaveBeenLastCalledWith(expect.objectContaining({
      data: {password: 'secret', user: 'postgres', role: ''},
    }));
  });

  it('passes on a failure that has no server response unchanged', async ()=>{
    const networkError = new Error('Network Error');
    const api = jest.fn().mockRejectedValue(networkError);
    const modal = createFakeModal();

    await expect(ensureServerConnected(api, modal, 1)).rejects.toBe(networkError);
    expect(modal.prompts).toHaveLength(0);
  });
});
