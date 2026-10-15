/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import ConnectServerContent from '../../../../../static/js/Dialogs/ConnectServerContent';

/* Raised when the user dismisses the password prompt rather than supplying
 * credentials. The flag lets callers tell a deliberate cancellation from a
 * genuine failure without matching on the (translated) message text. */
export function connectionCancelledError() {
  const error = new Error(gettext('Connection cancelled'));
  error.cancelled = true;
  return error;
}

export function connectServerModal(modal, modalData, connectCallback, cancelCallback) {
  modal.showModal(gettext('Connect to server'), (closeModal)=>{
    return (
      <ConnectServerContent
        closeModal={()=>{
          cancelCallback?.();
          closeModal();
        }}
        data={modalData}
        onOK={(formData)=>{
          connectCallback(Object.fromEntries(formData));
          closeModal();
        }}
      />
    );
  }, {
    onClose: cancelCallback,
  });
}

export async function connectServer(api, modal, sid, user, formData, connectCallback, cancelCallback, promptCallback) {
  try {
    let {data: respData} = await api({
      method: 'POST',
      url: url_for('sqleditor.connect_server', {'sid': sid}),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData
    });
    connectCallback?.(respData.data);
  } catch (error) {
    promptCallback?.(false);
    connectServerModal(modal, error.response?.data?.result, async (data)=>{
      promptCallback?.(true);
      connectServer(api, modal, sid, user, data, connectCallback, cancelCallback, promptCallback);
    }, ()=>{
      cancelCallback?.();
    });
  }
}

/* Make sure the server's own connection (the one the Object Explorer shows)
 * is established, prompting for its password if required. The Query Tool's
 * connection is separate, so without this a server that was disconnected
 * stays disconnected in the Object Explorer even though the Query Tool has
 * reconnected to it. Resolves once connected, and rejects with a cancelled
 * error if the user dismisses the prompt. */
export function ensureServerConnected(api, modal, sid, promptCallback) {
  return new Promise((resolve, reject)=>{
    connectServer(api, modal, sid, null, null, resolve, ()=>{
      reject(connectionCancelledError());
    }, promptCallback);
  });
}
