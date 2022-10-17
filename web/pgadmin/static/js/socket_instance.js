/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { io } from 'socketio';

export function openSocket(namespace, options) {
  return new Promise((resolve, reject)=>{
    const socketObj = io(namespace, {
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
    socketObj.on('connect_error', ()=>{
      reject();
    });
    socketObj.on('disconnect', ()=>{
      reject();
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
      reject(data);
    });
  });
}
