/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import Notifier from '../../pgadmin/static/js/helpers/Notifier';
import { MESSAGE_TYPE } from '../../pgadmin/static/js/components/FormComponents';


function makeStubs() {
  const modal = {
    alert: jest.fn(),
    confirm: jest.fn(),
    confirmDelete: jest.fn(),
    showModal: jest.fn(),
  };
  const snackbar = {
    callNotify: jest.fn(),
    notify: jest.fn(),
  };
  return { modal, snackbar };
}


describe('Notifier safe-variant snackbar methods', () => {
  it('errorText plumbs plainText: true to the snackbar', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    n.errorText('boom', 3000);
    expect(snackbar.callNotify).toHaveBeenCalledWith(
      'boom', MESSAGE_TYPE.ERROR, 3000, { plainText: true });
  });

  it('warningText, infoText, successText also set plainText: true', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    n.warningText('w');
    n.infoText('i');
    n.successText('s');
    expect(snackbar.callNotify.mock.calls[0])
      .toEqual(['w', MESSAGE_TYPE.WARNING, expect.anything(), { plainText: true }]);
    expect(snackbar.callNotify.mock.calls[1])
      .toEqual(['i', MESSAGE_TYPE.INFO, expect.anything(), { plainText: true }]);
    expect(snackbar.callNotify.mock.calls[2])
      .toEqual(['s', MESSAGE_TYPE.SUCCESS, expect.anything(), { plainText: true }]);
  });

  it('error (default) does not set plainText', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    n.error('boom', 3000);
    expect(snackbar.callNotify).toHaveBeenCalledWith(
      'boom', MESSAGE_TYPE.ERROR, 3000);
  });
});


describe('Notifier safe-variant modal alert', () => {
  it('alertText plumbs plainText: true to modal.alert', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    const cb = () => {};
    n.alertText('Error', 'boom', cb);
    expect(modal.alert).toHaveBeenCalledWith(
      'Error', 'boom', cb, 'OK', { plainText: true });
  });

  it('alert (default) does not pass plainText option', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    n.alert('Title', '<b>safe</b>');
    expect(modal.alert).toHaveBeenCalledWith(
      'Title', '<b>safe</b>', undefined, 'OK');
  });
});


describe('Notifier pgRespErrorNotify', () => {
  it('uses errorText for non-410 errors', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    const apiError = {
      response: {
        status: 500,
        headers: { 'content-type': 'application/json' },
        data: { errormsg: 'pg boom' },
      },
    };
    n.pgRespErrorNotify(apiError);
    expect(snackbar.callNotify).toHaveBeenCalledWith(
      expect.stringContaining('pg boom'), MESSAGE_TYPE.ERROR,
      expect.anything(), { plainText: true });
  });

  it('uses alertText for 410 Gone', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    const apiError = {
      response: {
        status: 410,
        statusText: 'Gone',
        headers: { 'content-type': 'application/json' },
        data: { errormsg: 'pg boom' },
      },
    };
    n.pgRespErrorNotify(apiError);
    expect(modal.alert).toHaveBeenCalledWith(
      expect.stringContaining('Gone'), 'pg boom',
      undefined, 'OK', { plainText: true });
  });
});


describe('Notifier pgNotifier', () => {
  it('alertText receives the raw errormsg — no _.escape, no \\n -> <br/>', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    const apiError = {
      response: {
        headers: { 'content-type': 'application/json' },
        data: { errormsg: 'line1\nline2 with <b>tag</b>' },
      },
    };
    n.pgNotifier('error', apiError, 'Title');
    expect(modal.alert).toHaveBeenCalledWith(
      'Title', 'line1\nline2 with <b>tag</b>',
      undefined, 'OK', { plainText: true });
  });

  it('falls back to "Unknown error" when result and errormsg are absent', () => {
    const { modal, snackbar } = makeStubs();
    const n = new Notifier(modal, snackbar);
    const apiError = {
      response: {
        headers: { 'content-type': 'application/json' },
        data: {},
      },
    };
    n.pgNotifier('error', apiError, 'Title');
    expect(modal.alert).toHaveBeenCalledWith(
      'Title', 'Unknown error', undefined, 'OK', { plainText: true });
  });
});
