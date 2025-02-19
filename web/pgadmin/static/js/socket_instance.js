/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { io } from 'socketio';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import { parseApiError } from './api_instance';
export function openSocket(namespace, options) {
  return new Promise((resolve, reject)=>{
    const socketObj = io(namespace, {
      path: `${url_for('pgadmin.root')}/socket.io`,
      pingTimeout: 120000,
      pingInterval: 25000,
      ...options,
    });

    /* Once the object is created, connect event is emitted.
    Backend must implement connect and emit connected on success,
    connect_error on failure.
    */
    socketObj.on('connected', ()=>{
      resolve(socketObj);
    });
    socketObj.on('connect_error', (err)=>{
      reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
    });
    socketObj.on('disconnect', (err)=>{
      reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
    });
  });
}

export function socketApiGet(socket, endpoint, params) {
  return new Promise((resolve, reject)=>{
    socket.emit(endpoint, params);
    socket.on(`${endpoint}_success`, (data)=>{
      resolve(data);
    });
    socket.on(`${endpoint}_failed`, (data)=>{
      /* when data comes in JSON format, 
      that must be parsed to only error message */
      reject(new Error(parseApiError(data)));
    });
    socket.on('disconnect', ()=>{
      reject(new Error(gettext('Connection to pgAdmin server has been lost')));
    });
  });
}
