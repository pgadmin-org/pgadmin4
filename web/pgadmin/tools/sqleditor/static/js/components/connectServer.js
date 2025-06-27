/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import ConnectServerContent from '../../../../../static/js/Dialogs/ConnectServerContent';

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

export async function connectServer(api, modal, sid, user, formData, connectCallback) {
  try {
    let {data: respData} = await api({
      method: 'POST',
      url: url_for('sqleditor.connect_server', {
        'sid': sid,
        ...(user ? {
          'usr': user,
        }:{}),
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData
    });
    connectCallback?.(respData.data);
  } catch (error) {
    connectServerModal(modal, error.response?.data?.result, async (data)=>{
      connectServer(api, modal, sid, user, data, connectCallback);
    }, ()=>{
      /*This is intentional (SonarQube)*/
    });
  }
}