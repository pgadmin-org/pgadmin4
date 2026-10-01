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

import { connectServer } from '../../../pgadmin/tools/sqleditor/static/js/components/connectServer';

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
