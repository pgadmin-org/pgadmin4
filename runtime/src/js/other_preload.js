/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronUI', {
  getConfigData: (key) => ipcRenderer.invoke('getStoreData', key),
  setConfigData: (newValues) => ipcRenderer.invoke('setStoreData', newValues),
  showMessageBox: (options) => ipcRenderer.invoke('showMessageBox', options),
  restartApp: ()=>{ ipcRenderer.send('restartApp'); },
  getServerLogFile: ()=>ipcRenderer.invoke('getServerLogFile'),
  readServerLog: ()=>ipcRenderer.invoke('readServerLog'),
  checkPortAvailable: (port)=>ipcRenderer.invoke('checkPortAvailable', port),
  openConfigure: ()=>ipcRenderer.invoke('openConfigure'),
});