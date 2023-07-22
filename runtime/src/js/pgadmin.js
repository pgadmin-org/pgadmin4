/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const misc = require('../js/misc.js');
const spawn = require('child_process').spawn;
const {EOL} = require('os');

let pgadminServerProcess = null;
let startPageUrl = null;
let serverCheckUrl = null;
let addMenuCompleted = false;
let pgAdminMainScreen = null;

let serverPort = 5050;
let appStartTime = (new Date()).getTime();

let docsURLSubStrings = ['www.enterprisedb.com', 'www.postgresql.org', 'www.pgadmin.org', 'help/help'];

// Paths to the rest of the app
let pythonPath = misc.getPythonPath();
let pgadminFile = '../web/pgAdmin4.py';
let configFile = '../web/config.py';

// Override the paths above, if a developer needs to
if (fs.existsSync('dev_config.json')) {
  try {
    let dev_config = JSON.parse(fs.readFileSync('dev_config.json'));
    pythonPath = dev_config['pythonPath'];
    pgadminFile = dev_config['pgadminFile'];
  } catch (error) {
    // Meh.
  }
}

// This functions is used to start the pgAdmin4 server by spawning a
// separate process.
function startDesktopMode() {
  // Return if pgAdmin server process is already spawned
  // Added check for debugging purpose.
  if (pgadminServerProcess != null)
    return;

  let UUID = crypto.randomUUID();
  // Set the environment variables so that pgAdmin 4 server
  // starts listening on the appropriate port.
  process.env.PGADMIN_INT_PORT = serverPort;
  process.env.PGADMIN_INT_KEY = UUID;
  process.env.PGADMIN_SERVER_MODE = 'OFF';

  // Start Page URL
  startPageUrl = 'http://127.0.0.1:' + serverPort + '/?key=' + UUID;
  serverCheckUrl = 'http://127.0.0.1:' + serverPort + '/misc/ping?key=' + UUID;

  document.getElementById('loader-text-status').innerHTML = 'Starting pgAdmin 4...';

  // Write Python Path, pgAdmin file path and command in log file.
  misc.writeServerLog('pgAdmin Runtime Environment');
  misc.writeServerLog('--------------------------------------------------------');
  let command = path.resolve(pythonPath) + ' -s ' + path.resolve(pgadminFile);
  misc.writeServerLog('Python Path: "' + path.resolve(pythonPath) + '"');
  misc.writeServerLog('Runtime Config File: "' + path.resolve(misc.getRunTimeConfigFile()) + '"');
  misc.writeServerLog('pgAdmin Config File: "' + path.resolve(configFile) + '"');
  misc.writeServerLog('Webapp Path: "' + path.resolve(pgadminFile) + '"');
  misc.writeServerLog('pgAdmin Command: "' + command + '"');
  misc.writeServerLog('Environment: ');
  Object.keys(process.env).forEach(function (key) {
    // Below code is included only for Mac OS as default path for azure CLI
    // installation path is not included in PATH variable while spawning
    // runtime environment.
    if (platform() === 'darwin' && key === 'PATH') {
      let updated_path = process.env[key] + ':/usr/local/bin';
      process.env[key] = updated_path;
    }

    if (platform() === 'win32' && (key === 'PATH' || key == 'Path')) {
      let _libpq_path = path.join(path.dirname(path.dirname(path.resolve(pgadminFile))), 'runtime');
      process.env[key] = _libpq_path + ';' + process.env[key];
    }

    misc.writeServerLog('  - ' + key + ': ' + process.env[key]);
  });
  misc.writeServerLog('--------------------------------------------------------\n');

  // Spawn the process to start pgAdmin4 server.
  let spawnStartTime = (new Date).getTime();
  pgadminServerProcess = spawn(path.resolve(pythonPath), ['-s', path.resolve(pgadminFile)]);
  pgadminServerProcess.on('error', function (err) {
    // Log the error into the log file if process failed to launch
    misc.writeServerLog('Failed to launch pgAdmin4. Error:');
    misc.writeServerLog(err);
  });
  let spawnEndTime = (new Date).getTime();
  misc.writeServerLog('Total spawn time to start the pgAdmin4 server: ' + (spawnEndTime - spawnStartTime) / 1000 + ' Sec');

  pgadminServerProcess.stdout.setEncoding('utf8');
  pgadminServerProcess.stdout.on('data', (chunk) => {
    misc.writeServerLog(chunk);
  });

  pgadminServerProcess.stderr.setEncoding('utf8');
  pgadminServerProcess.stderr.on('data', (chunk) => {
    misc.writeServerLog(chunk);
  });

  // This function is used to ping the pgAdmin4 server whether it
  // it is started or not.
  function pingServer() {
    return axios.get(serverCheckUrl);
  }

  let connectionTimeout = misc.ConfigureStore.get('connectionTimeout', 90) * 1000;
  let currentTime = (new Date).getTime();
  let endTime = currentTime + connectionTimeout;
  let midTime1 = currentTime + (connectionTimeout / 2);
  let midTime2 = currentTime + (connectionTimeout * 2 / 3);
  let pingInProgress = false;

  // ping pgAdmin server every 1 second.
  let pingStartTime = (new Date).getTime();
  let intervalID = setInterval(function () {
    // If ping request is already send and response is not
    // received no need to send another request.
    if (pingInProgress)
      return;

    pingServer().then(() => {
      pingInProgress = false;
      document.getElementById('loader-text-status').innerHTML = 'pgAdmin 4 started';
      // Set the pgAdmin process object to misc
      misc.setProcessObject(pgadminServerProcess);

      clearInterval(intervalID);
      let appEndTime = (new Date).getTime();
      misc.writeServerLog('------------------------------------------');
      misc.writeServerLog('Total time taken to ping pgAdmin4 server: ' + (appEndTime - pingStartTime) / 1000 + ' Sec');
      misc.writeServerLog('------------------------------------------');
      misc.writeServerLog('Total launch time of pgAdmin4: ' + (appEndTime - appStartTime) / 1000 + ' Sec');
      misc.writeServerLog('------------------------------------------');
      launchPgAdminWindow();
    }).catch(() => {
      pingInProgress = false;
      let curTime = (new Date).getTime();
      // if the connection timeout has lapsed then throw an error
      // and stop pinging the server.
      if (curTime >= endTime) {
        clearInterval(intervalID);
        splashWindow.hide();

        nw.Window.open('src/html/server_error.html', {
          'frame': true,
          'width': 790,
          'height': 430,
          'position': 'center',
          'resizable': false,
          'focus': true,
          'show': true,
        });
      }

      if (curTime > midTime1) {
        if (curTime < midTime2) {
          document.getElementById('loader-text-status').innerHTML = 'Taking longer than usual...';
        } else {
          document.getElementById('loader-text-status').innerHTML = 'Almost there...';
        }
      } else {
        document.getElementById('loader-text-status').innerHTML = 'Waiting for pgAdmin 4 to start...';
      }
    });

    pingInProgress = true;
  }, 250);
}

// This function is used to hide the splash screen and create/launch
// new window to render pgAdmin4 page.
function launchPgAdminWindow() {
  // Create and launch new window and open pgAdmin url
  misc.writeServerLog('Application Server URL: ' + startPageUrl);
  nw.Window.open(startPageUrl, {
    'id': 'pgadmin-main',
    'icon': '../../assets/pgAdmin4.png',
    'frame': true,
    'position': 'center',
    'resizable': true,
    'min_width': 640,
    'min_height': 480,
    'width': 1024,
    'height': 768,
    'focus': true,
    'show': false,
  }, (pgadminWindow) => {
    pgAdminMainScreen = pgadminWindow;
    // Set pgAdmin4 Windows Object
    misc.setPgAdminWindowObject(pgadminWindow);

    // Set the zoom level stored in the config file.
    pgadminWindow.zoomLevel = misc.ConfigureStore.get('zoomLevel', 0);

    // Set zoom in and out events.
    misc.setZoomEvents();

    pgadminWindow.on('closed', function () {
      misc.cleanupAndQuitApp();
    });

    // set up handler for new-win-policy event.
    // Set the width and height for the new window.
    pgadminWindow.on('new-win-policy', function (frame, url, policy) {
      if (!frame) {
        let openDocsInBrowser = misc.ConfigureStore.get('openDocsInBrowser', true);
        let isDocURL = false;
        docsURLSubStrings.forEach(function (key) {
          if (url.indexOf(key) >= 0) {
            isDocURL = true;
          }

        });


        if (openDocsInBrowser && isDocURL) {
          // Do not open the window
          policy.ignore();
          // Open URL in the external browser.
          nw.Shell.openExternal(url);
        } else {
          policy.setNewWindowManifest({
            'icon': '../../assets/pgAdmin4.png',
            'frame': true,
            'position': 'center',
            'min_width': 640,
            'min_height': 480,
            'width': pgadminWindow.width,
            'height': pgadminWindow.height,
          });
        }
      }
    });

    pgadminWindow.on('loaded', function () {
      /* Make the new window opener to null as it is
       * nothing but a splash screen. We will have to make it null,
       * so that open in new browser tab will work.
       */
      pgadminWindow.window.hookConsole((method, args)=>{
        misc.writeServerLog(
          `--------------[UI ${method}]---------------${EOL}${misc.parseConsoleArgs(method, args)}${EOL}------------[UI End]----------------`);
      });
      pgadminWindow.window.opener = null;

      // Show new window
      pgadminWindow.show();
      pgadminWindow.focus();

      nativeMenu = new gui.Menu({ type: 'menubar' });
      // Create Mac Builtin Menu
      if (platform() === 'darwin') {
        nativeMenu.createMacBuiltin('pgAdmin 4');
        nativeMenu?.items[0].submenu.removeAt(0)
        pgAdminMainScreen.menu = nativeMenu;
      }

      try {
        pgAdminMainScreen.isCustomMenusAdded = false;
        let addMenuInterval = setInterval(() => {
          if (pgadminWindow?.window?.pgAdmin?.Browser?.Events && pgadminWindow?.window?.pgAdmin?.Browser?.MainMenus?.length > 0) {
            pgadminWindow.window.pgAdmin.Browser.Events.on('pgadmin:nw-enable-disable-menu-items', enableDisableMenuItem);
            pgadminWindow.window.pgAdmin.Browser.Events.on('pgadmin:nw-refresh-menu-item', refreshMenuItems);
            pgadminWindow.window.pgAdmin.Browser.Events.on('pgadmin:nw-update-checked-menu-item', updateCheckedMenuItem);
            pgadminWindow.window.pgAdmin.Browser.Events.on('pgadmin:nw-set-new-window-open-size', setNewWindowSize)
            // Add Main Menus to native menu.
            pgadminWindow.window.pgAdmin.Browser.MainMenus.forEach((menu)=> {
              addMenu(menu)
            })
            clearInterval(addMenuInterval);
          }
        }, 250)
      } catch (e) {
        console.error('Error in add native menus');
      }

      // Hide the splash screen
      splashWindow.hide();
    });

    pgadminWindow.on('blur', function () {
      misc.unregisterZoomEvents();
    });

    pgadminWindow.on('focus', function () {
      misc.registerZoomEvents();
    });
  });
}

// Get the gui object of NW.js
let gui = require('nw.gui');
let splashWindow = gui.Window.get();

// Enable dragging on the splash screen.
let isDragging = false;
let dragOrigin = { x: 0, y: 0 };
document.mouseleave = () => isDragging = false;
document.onmouseup = () => isDragging = false;

document.onmousedown = (e) => {
  isDragging = true;
  dragOrigin.x = e.x;
  dragOrigin.y = e.y;
};

document.onmousemove = (e) => {
  if (isDragging) {
    splashWindow.moveTo(e.screenX - dragOrigin.x, e.screenY - dragOrigin.y);
  }
};

// Always clear the cache before starting the application.
nw.App.clearCache();

let nativeMenu;

splashWindow.on('loaded', function () {
  // Initialize the ConfigureStore
  misc.ConfigureStore.init();

  let fixedPortCheck = misc.ConfigureStore.get('fixedPort', false);
  if (fixedPortCheck) {
    serverPort = misc.ConfigureStore.get('portNo');
    //Start the pgAdmin in Desktop mode.
    startDesktopMode();
  } else {
    // get the available TCP port by sending port no to 0.
    misc.getAvailablePort(0)
      .then((pythonApplicationPort) => {
        serverPort = pythonApplicationPort;
        //Start the pgAdmin in Desktop mode.
        startDesktopMode();
      })
      .catch((errCode) => {
        if (errCode === 'EADDRINUSE') {
          alert('The port specified is already in use. Please enter a free port number.');
        } else {
          alert(errCode);
        }
      });
  }
});

splashWindow.on('close', function () {
  misc.cleanupAndQuitApp();
});

function setNewWindowSize(){
  misc.setZoomLevelForAllWindows();
}


function addCommonMenus(menu) {
  let _menu = new gui.Menu();

  menu.menuItems.forEach((menuItem) => {
    let submenu = getSubMenu(menuItem);

    let _menuItem = new gui.MenuItem({
      label: menuItem.label,
      enabled: !menuItem.isDisabled,
      type: menuItem.type || 'normal',
      priority: menuItem.priority,
      ...(submenu.items.length > 0) && {
        submenu: submenu,
      },
      click: function () {
        menuItem.callback();
      },
    });
    _menu.append(_menuItem);
  });

  if (menu.name == 'file') {
    let runtimeMenu = getRuntimeMenu();
    _menu.append(runtimeMenu);
  }

  if (menu.menuItems.length == 0) {
    let _menuItem = new gui.MenuItem({
      label: 'No object selected',
      enabled: false,
      priority: 0,
    });
    _menu.append(_menuItem);
  }

  if (platform() == 'darwin') {
    pgAdminMainScreen.menu.insert(new gui.MenuItem({
      label: menu.label,
      name: menu.name,
      submenu: _menu,
    }), menu.index);
  } else {
    nativeMenu.append(new gui.MenuItem({
      label: menu.label,
      name: menu.name,
      submenu: _menu,
    }));
    pgAdminMainScreen.menu = nativeMenu;
  }

}

function getRuntimeMenu() {
  let subMenus = new gui.Menu();
  let rtmenudt = pgAdminMainScreen.window.pgAdmin.Browser.RUNTIME_MENUS_OPTIONS['runtime']
  let runtimeSubMenus = pgAdminMainScreen.window.pgAdmin.Browser.RUNTIME_MENUS_OPTIONS['runtime']['submenus']
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['configure'].label,
    enabled: runtimeSubMenus['configure'].enable,
    priority: runtimeSubMenus['configure'].priority,
    type: 'normal',
    checked: false,
    click: function () {
      // Create and launch new window and open pgAdmin url
      nw.Window.open('src/html/configure.html', {
        'frame': true,
        'width': 600,
        'height': 585,
        'position': 'center',
        'resizable': false,
        'focus': true,
        'show': true,
      });
    },
  }));
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['view_log'].label,
    enabled: runtimeSubMenus['view_log'].enable,
    priority: runtimeSubMenus['view_log'].priority,
    type: 'normal',
    checked: false,
    click: function () {
      // Create and launch new window and open pgAdmin url
      nw.Window.open('src/html/view_log.html', {
        'frame': true,
        'width': 790,
        'height': 425,
        'position': 'center',
        'resizable': false,
        'focus': true,
        'show': true,
      });
    },
  }));
  subMenus.append(new nw.MenuItem({ type: 'separator' }));
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['enter_full_screen'].label,
    enabled: runtimeSubMenus['enter_full_screen'].enable,
    priority: runtimeSubMenus['enter_full_screen'].priority,
    type: 'normal',
    checked: false,
    key: runtimeSubMenus['enter_full_screen'].key,
    modifiers: runtimeSubMenus['enter_full_screen'].modifiers,
    click: function () {
      misc.toggleFullScreen();
    },
  }));
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['actual_size'].label,
    enabled: runtimeSubMenus['actual_size'].enable,
    priority: runtimeSubMenus['actual_size'].priority,
    type: 'normal',
    checked: false,
    key: runtimeSubMenus['actual_size'].key,
    modifiers: runtimeSubMenus['actual_size'].modifiers,
    click: function () {
      misc.actualSize();
    },
  }));
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['zoom_in'].label,
    enabled: runtimeSubMenus['zoom_in'].enable,
    priority: runtimeSubMenus['zoom_in'].priority,
    type: 'normal',
    checked: false,
    key: runtimeSubMenus['zoom_in'].key,
    modifiers: runtimeSubMenus['zoom_in'].modifiers,
    click: function () {
      misc.zoomIn();
    },
  }));
  subMenus.append(new gui.MenuItem({
    label: runtimeSubMenus['zoom_out'].label,
    enabled: runtimeSubMenus['zoom_out'].enable,
    priority: runtimeSubMenus['zoom_out'].priority,
    type: 'normal',
    checked: false,
    key: runtimeSubMenus['zoom_out'].key,
    modifiers: runtimeSubMenus['zoom_out'].modifiers,
    click: function () {
      misc.zoomOut();
    },
  }));

  let runtimeMenu = new gui.MenuItem({
    label: rtmenudt.label,
    enabled: true,
    priority: rtmenudt.priority,
    type: 'normal',
    checked: false,
    submenu: subMenus,
})

  return runtimeMenu;

}

function getSubMenu(menuItem) {
  let submenu = new gui.Menu();
  if (menuItem.menu_items) {
    menuItem.menu_items.forEach((item) => {
      let menuType = typeof item.checked == 'boolean' ? 'checkbox' : item.type;
      submenu.append(new gui.MenuItem({
        label: item.label,
        enabled: !item.isDisabled,
        priority: item.priority,
        type: menuType,
        checked: item.checked,
        click: function () {
          if (menuType == 'checkbox') {
            pgAdminMainScreen.menu.items.forEach(el => {
              el.submenu.items.forEach((sub) => {
                if (sub.submenu?.items?.length) {
                  sub.submenu.items.forEach((m) => {
                    if (m.type == 'checkbox') {
                      m.label == item.label ? m.checked = true : m.checked = false;
                    }
                  });
                }
              });
            });
          }
          item.callback();
        },
      }));
    });
  }
  return submenu;
}

function addMacMenu(menu) {
  if (menu.name == 'file' && platform() === 'darwin') {
    let rootMenu = nativeMenu.items[0].submenu;
    let indx = 0;
    menu.menuItems.forEach((menuItem) => {
      let submenu = getSubMenu(menuItem);

      rootMenu.insert(
        new gui.MenuItem({
          label: menuItem.label,
          type: menuItem.type || 'normal',
          enabled: !menuItem.isDisabled,
          priority: menuItem.priority,
          ...(submenu.items.length > 0) && {
            submenu: submenu,
          },
          click: function () {
            // Callback functions for actions
            menuItem.callback();
          },
        }), indx);
      indx++;
    });
    let runtimeMenu = getRuntimeMenu();
    rootMenu.insert(runtimeMenu, indx++);
    let separator_menu = new nw.MenuItem({ type: 'separator' });
    rootMenu.insert(separator_menu, indx);
    indx++;

    pgAdminMainScreen.menu = nativeMenu;
  } else {
    addCommonMenus(menu)
  }
}

function addOtherOsMenu(menu) {
  addCommonMenus(menu)
}


function addMenu(menu) {
  pgAdminMainScreen.isCustomMenusAdded = true;
  if (platform() === 'darwin') {
    addMacMenu(menu);
  } else {
    addOtherOsMenu(menu);
  }
  addMenuCompleted = true;
}

function enableDisableMenuItem(menu, menuItem) {
  if (addMenuCompleted) {
    // Enable or Disabled specific menu item
    pgAdminMainScreen.menu.items.forEach(el => {
      if (el?.label == menu?.label) {
        el.submenu.items.forEach((sub) => {
          if (sub.label == menuItem.label) {
            sub.enabled = !menuItem.isDisabled;
          }
        });
      }
    });
  }
}

function updateCheckedMenuItem(menuItem) {
  // check/ uncheck specific menu item
  pgAdminMainScreen.menu.items.forEach(el => {
    el.submenu.items.forEach((sub) => {
      if(sub.label == menuItem.parentMenu.label) {
        sub.submenu.items.forEach((sm)=> {
          if (sm.label == menuItem.label && sm.type == 'checkbox') {
            sm.checked = menuItem.checked
          }
        })
      } else {
        if (sub.label == menuItem.label && type == 'checkbox') {
          sub.checked = menuItem.checked
        }
      }
    });
  });
}

function refreshMenuItems(menu) {
  // Add menu item/option in specific menu.
  pgAdminMainScreen.menu.items.forEach(el => {
    if (el.label == menu.label) {
      let totalSubItems = el.submenu.items.length;

      // Remove exisitng menu options to add new options.
      for (let i = 0; i < totalSubItems; i++) {
        el.submenu.removeAt(0);
      }
      menu.menuItems.forEach((item) => {

        let submenu = new gui.Menu();
        if (item.menu_items) {
          item.menu_items.forEach((subItem) => {
            submenu.append(new gui.MenuItem({
              label: subItem.label,
              enabled: !subItem.isDisabled,
              priority: subItem.priority,
              type: [true, false].includes(subItem.checked) ? 'checkbox' : 'normal',
              checked: subItem.checked,
              click: function () {
                subItem.callback();
              },
            }));
          });
        }
        let _menuItem = new gui.MenuItem({
          label: item.label,
          enabled: !item.isDisabled,
          priority: item.priority,
          type: item.type,
          ...(submenu.items.length > 0) && {
            submenu: submenu,
          },
          click: function () {
            item.callback();
          },
        });

        el.submenu.append(_menuItem);
      });
    }
  });

}
