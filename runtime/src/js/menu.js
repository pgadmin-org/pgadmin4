/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { app, Menu, ipcMain, BrowserWindow, globalShortcut } from 'electron';

const isMac = process.platform == 'darwin';
const isLinux = process.platform == 'linux';
let mainMenu;
let cachedMenus;

// Use to convert shortcut to accelerator for electron.
function convertShortcutToAccelerator({ control, meta, shift, alt, key } = {}) {
  // Store active modifier keys into an array.
  const mods = [
    control && 'Ctrl',
    meta && 'Cmd',
    shift && 'Shift',
    alt && 'Alt',
  ].filter(Boolean); // Remove any falsy values
  // Get the actual key character and convert to uppercase.
  const k = key?.char?.toUpperCase();
  if (!k) return;
  // Combine modifiers and key into a single string.
  return [...mods, k].join('+');
}

// Binds click events to all menu and submenu items recursively.
function bindMenuClicks(pgadminMenus, pgAdminMainScreen) {
  return pgadminMenus.map((menuItem) => ({
    ...menuItem,
    submenu: menuItem.submenu?.map((subMenuItem) => {
      const smName = `${menuItem.name}_${subMenuItem.name}`;
      return {
        ...subMenuItem,
        accelerator: convertShortcutToAccelerator(subMenuItem.shortcut),
        click: (_menuItem, _browserWindow, event)=>{
          if(event?.triggeredByAccelerator) {
            // We will ignore the click event if it is triggered by an accelerator.
            // We use accelerator to only show the shortcut title in the menu.
            // The actual shortcut is already handled by pgAdmin.
            return;
          }
          pgAdminMainScreen.webContents.send('menu-click', smName);
        },
        submenu: subMenuItem.submenu?.map((deeperSubMenuItem) => ({
          ...deeperSubMenuItem,
          accelerator: convertShortcutToAccelerator(deeperSubMenuItem.shortcut),
          click: (_menuItem, _browserWindow, event)=>{
            if(event?.triggeredByAccelerator) {
              // We will ignore the click event if it is triggered by an accelerator.
              // We use accelerator to only show the shortcut title in the menu.
              // The actual shortcut is already handled by pgAdmin.
              return;
            }
            pgAdminMainScreen.webContents.send('menu-click', `${smName}_${deeperSubMenuItem.name}`);
          },
        })),
      };
    }),
  }));
}

// Handles auto-update related menu items for macOS.
// Adds or disables update menu items based on config state.
function handleAutoUpdateMenu(menuFile, configStore, callbacks) {
  if (!configStore.get('auto_update_enabled')) return;
  if (configStore.get('update_downloaded')) {
    // Add "Restart to Update" if update is downloaded
    menuFile.submenu.unshift({
      name: 'mnu_restart_to_update',
      id: 'mnu_restart_to_update',
      label: 'Restart to Update...',
      enabled: true,
      priority: 998,
      click: callbacks['restart_to_update'],
    });
  } else {
    // Add "Check for Updates" if update is not downloaded
    menuFile.submenu.unshift({
      name: 'mnu_check_updates',
      id: 'mnu_check_updates',
      label: 'Check for Updates...',
      enabled: true,
      priority: 998,
      click: callbacks['check_for_updates'],
    });
  }
  // Disable "Check for Updates" if update is downloading
  if (configStore.get('update_downloading')) {
    menuFile.submenu.forEach((item) => {
      if (item.id == 'mnu_check_updates') item.enabled = false;
    });
  }
}

// Remove About pgAdmin 4 from help menu and add it to the top of menuFile submenu.
function moveAboutMenuToTop(pgadminMenus, menuFile) {
  const helpMenu = pgadminMenus.find((menu) => menu.name == 'help');
  if (!helpMenu) return;
  const aboutItem = helpMenu.submenu.find((item) => item.name === 'mnu_about');
  if (!aboutItem) return;
  helpMenu.submenu = helpMenu.submenu.filter((item) => item.name !== 'mnu_about');
  menuFile.submenu.unshift(aboutItem);
  menuFile.submenu.splice(2, 0, { type: 'separator' });
}

// Builds the application menu template and binds menu click events.
// Handles platform-specific menu structure and dynamic menu items.
function buildMenu(pgadminMenus, pgAdminMainScreen, configStore, callbacks) {
  const template = [];

  pgadminMenus = bindMenuClicks(pgadminMenus, pgAdminMainScreen);

  let menuFile = pgadminMenus.shift();

  // macOS-specific menu modifications
  if (isMac) {
    handleAutoUpdateMenu(menuFile, configStore, callbacks);
    moveAboutMenuToTop(pgadminMenus, menuFile);
  }

  template.push({
    ...menuFile,
    submenu: [
      ...menuFile.submenu,
      { type: 'separator' },
      { label: 'View Logs...', click: callbacks['view_logs'] },
      { label: 'Configure runtime...', click: callbacks['configure'] },
      { type: 'separator' },
      ...(isMac
        ? [
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
          ]
        : []),
      { role: 'quit' },
    ],
  });

  if (isMac) {
    template[0].label = app.name;
  }

  // push all except help
  template.push(...pgadminMenus.slice(0, -1));

  template.push(
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', click: callbacks['reloadApp'] },
        {
          label: 'Toggle Developer Tools',
          click: () =>
            BrowserWindow.getFocusedWindow().webContents.openDevTools({
              mode: 'bottom',
            }),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
      ].concat(isLinux ? [] : [{ role: 'togglefullscreen' }]),
    },
    { role: 'windowMenu' }
  );

  template.push(pgadminMenus[pgadminMenus.length - 1]);

  return Menu.buildFromTemplate(template);
}

function buildAndSetMenus(menus, pgAdminMainScreen, configStore, callbacks={}) {
  mainMenu = buildMenu(menus, pgAdminMainScreen, configStore, callbacks);
  if(isMac) {
    Menu.setApplicationMenu(mainMenu);
  } else {
    pgAdminMainScreen.setMenu(mainMenu);
  }
}

export function refreshMenus(pgAdminMainScreen, configStore, callbacks={}) {
  buildAndSetMenus(cachedMenus, pgAdminMainScreen, configStore, callbacks);
}

export function setupMenu(pgAdminMainScreen, configStore, callbacks={}) {
  ipcMain.on('setMenus', (event, menus)=>{
    // this is important because the shortcuts are registered multiple times
    // when the menu is set multiple times using accelerators.
    globalShortcut.unregisterAll();
    cachedMenus = menus; //It will be used later for refreshing the menus
    buildAndSetMenus(menus, pgAdminMainScreen, configStore, callbacks);

    ipcMain.on('enable-disable-menu-items', (event, menu, menuItem)=>{
      const menuItemObj = mainMenu.getMenuItemById(menuItem?.id);
      if(menuItemObj) {
        menuItemObj.enabled = menuItem.isDisabled;
      }
    });
  });
}