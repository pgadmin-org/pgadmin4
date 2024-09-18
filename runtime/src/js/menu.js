/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { app, Menu, ipcMain, BrowserWindow } from 'electron';

const isMac = process.platform == 'darwin';
const isLinux = process.platform == 'linux';
let mainMenu;

function buildMenu(pgadminMenus, pgAdminMainScreen, callbacks) {
  const template = [];

  // bind all menus click event.
  pgadminMenus = pgadminMenus.map((menuItem)=>{
    return {
      ...menuItem,
      submenu: menuItem.submenu?.map((subMenuItem)=>{
        const smName = `${menuItem.name}_${subMenuItem.name}`;
        return {
          ...subMenuItem,
          click: ()=>{
            pgAdminMainScreen.webContents.send('menu-click', smName);
          },
          submenu: subMenuItem.submenu?.map((deeperSubMenuItem)=>{
            return {
              ...deeperSubMenuItem,
              click: ()=>{
                pgAdminMainScreen.webContents.send('menu-click', `${smName}_${deeperSubMenuItem.name}`);
              },
            };
          }),
        };
      }),
    };
  });

  let menuFile = pgadminMenus.shift();
  template.push({
    ...menuFile,
    submenu: [
      ...menuFile.submenu,
      { type: 'separator' },
      {
        label: 'View Logs...', click: callbacks['view_logs'],
      },
      {
        label: 'Configure runtime...', click: callbacks['configure'],
      },
      { type: 'separator' },
      ...(isMac ? [
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
      ] : []),
      { role: 'quit' },
    ],
  });

  if(isMac) {
    template[0].label = app.name;
  }

  // push all except help
  template.push(...pgadminMenus.slice(0, -1));

  template.push(
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', click: callbacks['reloadApp']},
        { label: 'Toggle Developer Tools', click: ()=>BrowserWindow.getFocusedWindow().webContents.openDevTools({ mode: 'bottom' })},
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
      ].concat(isLinux ? [] : [{ role: 'togglefullscreen' }]),
    },
    { role: 'windowMenu' },
  );

  template.push(pgadminMenus[pgadminMenus.length-1]);

  return Menu.buildFromTemplate(template);
}

export function setupMenu(pgAdminMainScreen, callbacks={}) {
  ipcMain.on('setMenus', (event, menus)=>{
    mainMenu = buildMenu(menus, pgAdminMainScreen, callbacks);
    if(isMac) {
      Menu.setApplicationMenu(mainMenu);
    } else {
      pgAdminMainScreen.setMenu(mainMenu);
    }

    ipcMain.on('enable-disable-menu-items', (event, menu, menuItem)=>{
      const menuItemObj = mainMenu.getMenuItemById(menuItem?.id);
      if(menuItemObj) {
        menuItemObj.enabled = menuItem.isDisabled;
      }
    });
  });
}