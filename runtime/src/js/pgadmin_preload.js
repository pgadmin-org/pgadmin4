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
  onMenuClick: (callback) => ipcRenderer.on('menu-click', (_event, details) => callback(details)),
  setMenus: (menus) => {
    ipcRenderer.send('setMenus', menus);
  },
  enableDisableMenuItems: (menu, item) => {
    ipcRenderer.send('enable-disable-menu-items', menu, item);
  },
  setMenuItems: (menu, menuItems) => {
    ipcRenderer.send('set-menu-items', menu, menuItems);
  },
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('showSaveDialog', options),
  log: (text)=> ipcRenderer.send('log', text),
  reloadApp: ()=>{ipcRenderer.send('reloadApp');},
  onFileDownload: (payload) => ipcRenderer.send('onFileDownload', payload),
});