/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');
const net = require('net');
const {platform, homedir} = require('os');
let pgadminServerProcess = null;
let pgAdminWindowObject = null;
let zoomInShortcut = null;
let zoomOutShortcut = null;
let actualSizeShortcut = null;
let toggleFullScreenShortcut = null;

// This function is used to check whether directory is present or not
// if not present then create it recursively
const createDir = (dirName) => {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, {recursive: true});
  }
};

// This function is used to get the python executable path
// based on the platform. Use this for deployment.
const getPythonPath = () => {
  let pythonPath;
  switch (platform()) {
  case 'win32':
    pythonPath = '../python/python.exe';
    break;
  case 'darwin':
    pythonPath = '../../Frameworks/Python.framework/Versions/Current/bin/python3';
    break;
  case 'linux':
    pythonPath = '../venv/bin/python3';
    break;
  default:
    if (platform().startsWith('win')) {
      pythonPath = '../python/python.exe';
    } else {
      pythonPath = '../venv/bin/python3';
    }
  }

  return pythonPath;
};

// This function is used to get the [roaming] app data path
// based on the platform. Use this for config etc.
const getAppDataPath = () => {
  let appDataPath;
  switch (platform()) {
  case 'win32':
    appDataPath = path.join(process.env.APPDATA, 'pgadmin');
    break;
  case 'darwin':
    appDataPath = path.join(homedir(), 'Library', 'Preferences', 'pgadmin');
    break;
  case 'linux':
    if ('XDG_CONFIG_HOME' in process.env) {
      appDataPath = path.join(process.env.XDG_CONFIG_HOME, 'pgadmin');
    } else {
      appDataPath = path.join(homedir(), '.config', 'pgadmin');
    }
    break;
  default:
    if (platform().startsWith('win')) {
      appDataPath = path.join(process.env.APPDATA, 'pgadmin');
    } else {
      if ('XDG_CONFIG_HOME' in process.env) {
        appDataPath = path.join(process.env.XDG_CONFIG_HOME, 'pgadmin');
      } else {
        appDataPath = path.join(homedir(), '.config', 'pgadmin');
      }
    }
  }

  // Create directory if not exists
  createDir(appDataPath);

  return appDataPath;
};

// This function is used to get the [local] app data path
// based on the platform. Use this for logs etc.
const getLocalAppDataPath = () => {
  let localAppDataPath;
  switch (platform()) {
  case 'win32':
    localAppDataPath = path.join(process.env.LOCALAPPDATA, 'pgadmin');
    break;
  case 'darwin':
    localAppDataPath = path.join(homedir(), 'Library', 'Application Support', 'pgadmin');
    break;
  case 'linux':
    if ('XDG_DATA_HOME' in process.env) {
      localAppDataPath = path.join(process.env.XDG_DATA_HOME, 'pgadmin');
    } else {
      localAppDataPath = path.join(homedir(), '.local', 'share', 'pgadmin');
    }
    break;
  default:
    if (platform().startsWith('win')) {
      localAppDataPath = path.join(process.env.LOCALAPPDATA, 'pgadmin');
    } else {
      if ('XDG_DATA_HOME' in process.env) {
        localAppDataPath = path.join(process.env.XDG_DATA_HOME, 'pgadmin');
      } else {
        localAppDataPath = path.join(homedir(), '.local', 'share', 'pgadmin');
      }
    }
  }

  // Create directory if not exists
  createDir(localAppDataPath);

  return localAppDataPath;
};

// This function is used to get the random available TCP port
// if fixedPort is set to 0. Else check whether port is in used or not.
const getAvailablePort = (fixedPort) => {
  return new Promise(function(resolve, reject) {
    const server = net.createServer();

    server.listen(fixedPort, '127.0.0.1');

    server.on('error', (e) => {
      reject(e.code);
    });

    server.on('listening', () => {
      let serverPort = server.address().port;
      server.close();
      resolve(serverPort);
    });
  });
};

// Get the app data folder path
const currentTime = (new Date()).getTime();
const serverLogFile = path.join(getLocalAppDataPath(), 'pgadmin4.' + currentTime.toString() + '.log');
const configFileName = path.join(getAppDataPath(), 'runtime_config.json');
const DEFAULT_CONFIG_DATA = {'fixedPort': false, 'portNo': 5050, 'connectionTimeout': 90, 'zoomLevel': 0};

// This function is used to read the file and return the content
const readServerLog = () => {
  let data = null;

  if (fs.existsSync(serverLogFile)) {
    data = fs.readFileSync(serverLogFile, 'utf8');
  } else {
    let errMsg = 'Unable to read file ' + serverLogFile + '.';
    console.warn(errMsg);
    return errMsg;
  }

  return data;
};

// This function is used to write the data into the log file
const writeServerLog = (data) => {
  data = data + '\n';
  if (fs.existsSync(serverLogFile)) {
    fs.writeFileSync(serverLogFile, data, {flag: 'a+'});
  } else {
    fs.writeFileSync(serverLogFile, data, {flag: 'w'});
  }
};

// This function is used to remove the log file
const removeLogFile = () => {
  if (fs.existsSync(serverLogFile)) {
    fs.rmSync(serverLogFile);
  }
};

// This function used to set the object of pgAdmin server process.
const setProcessObject = (processObject) => {
  pgadminServerProcess = processObject;
};

// This function used to set the object of pgAdmin window.
const setPgAdminWindowObject = (windowObject) => {
  pgAdminWindowObject = windowObject;
};

// This function is used to get the server log file.
const getServerLogFile = () => {
  return serverLogFile;
};

// This function is used to get the runtime config file.
const getRunTimeConfigFile = () => {
  return configFileName;
};

// This function is used to kill the server process, remove the log files
// and quit the application.
const cleanupAndQuitApp = () => {
  // Remove the server log file on exit
  removeLogFile();

  // Killing pgAdmin4 server process if application quits
  if (pgadminServerProcess != null) {
    try {
      process.kill(pgadminServerProcess.pid);
    }
    catch (e) {
      console.warn('Failed to kill server process.');
    }
  }

  if (pgAdminWindowObject != null) {
    // Remove all the cookies.
    pgAdminWindowObject.cookies.getAll({}, function(cookies) {
      try {
        cookies.forEach(function(cookie) {
          pgAdminWindowObject.cookies.remove({url: 'http://' + cookie.domain, name: cookie.name});
        });
      } catch (error) {
        console.warn('Failed to remove cookies.');
      } finally {
        pgAdminWindowObject = null;
        // Quit Application
        nw.App.quit();
      }
    });
  } else {
    // Quit Application
    nw.App.quit();
  }
};

// This function is used to create zoom events based on platform
const setZoomEvents = () => {
  if (platform() == 'darwin') {
    zoomInShortcut = new nw.Shortcut({key: 'Command+Equal'});
    zoomOutShortcut = new nw.Shortcut({key: 'Command+Minus'});
    actualSizeShortcut = new nw.Shortcut({key: 'Command+0'});
    toggleFullScreenShortcut = new nw.Shortcut({key: 'Command+Ctrl+F'});
  } else {
    zoomInShortcut = new nw.Shortcut({key: 'Ctrl+Equal'});
    zoomOutShortcut = new nw.Shortcut({key: 'Ctrl+Minus'});
    actualSizeShortcut = new nw.Shortcut({key: 'Ctrl+0'});
    // Use F10 instead of F11. F11 does not work possibly due to Chromium reserving it for their function.
    toggleFullScreenShortcut = new nw.Shortcut({key: 'F10'});
  }

  zoomInShortcut.on('active', function() {
    zoomIn();
  });

  zoomOutShortcut.on('active', function() {
    zoomOut();
  });

  actualSizeShortcut.on('active', function() {
    actualSize();
  });

  toggleFullScreenShortcut.on('active', function() {
    toggleFullScreen();
  });

  zoomInShortcut.on('failed', function(msg) {
    let errMsg = 'Failed to register zoom in shortcut with error: ' + msg;
    console.warn(errMsg);
  });

  zoomOutShortcut.on('failed', function(msg) {
    let errMsg = 'Failed to register zoom out shortcut with error: ' + msg;
    console.warn(errMsg);
  });

  actualSizeShortcut.on('failed', function(msg) {
    let errMsg = 'Failed to register actual size shortcut with error: ' + msg;
    console.warn(errMsg);
  });

  toggleFullScreenShortcut.on('failed', function(msg) {
    let errMsg = 'Failed to register toggle full screen shortcut with error: ' + msg;
    console.warn(errMsg);
  });
};

// This function is used to iterate all open windows and set the zoom level.
const setZoomLevelForAllWindows = () => {
  nw.Window.getAll(function(winArray) {
    for (var i = 0; i < winArray.length; i++) {
      winArray[i].zoomLevel = pgAdminWindowObject.zoomLevel;
    }
  })
};

// This function used to zoom in the pgAdmin window.
const zoomIn = () => {
  if (pgAdminWindowObject != null) {
    pgAdminWindowObject.zoomLevel += 0.5;
    setZoomLevelForAllWindows();
    ConfigureStore.set('zoomLevel', pgAdminWindowObject.zoomLevel);
    ConfigureStore.saveConfig();
  }
};

// This function used to zoom out the pgAdmin window.
const zoomOut = () => {
  if (pgAdminWindowObject != null) {
    pgAdminWindowObject.zoomLevel -= 0.5;
    setZoomLevelForAllWindows();
    ConfigureStore.set('zoomLevel', pgAdminWindowObject.zoomLevel);
    ConfigureStore.saveConfig();
  }
};

// This function used to reset the zoom level of pgAdmin window.
const actualSize = () => {
  if (pgAdminWindowObject != null) {
    pgAdminWindowObject.zoomLevel = 0;
    setZoomLevelForAllWindows();
    ConfigureStore.set('zoomLevel', pgAdminWindowObject.zoomLevel);
    ConfigureStore.saveConfig();
  }
};

const toggleFullScreen = () => {
  if (pgAdminWindowObject != null) {
    // Toggle full screen
    pgAdminWindowObject.toggleFullscreen();

    // Change the menu label.
    var menu_label = pgAdminWindowObject.window.document.querySelector('#mnu_toggle_fullscreen_runtime span').innerHTML;
    if (menu_label.indexOf('Enter Full Screen') > 0) {
      pgAdminWindowObject.window.document.querySelector('#mnu_toggle_fullscreen_runtime span').innerHTML = menu_label.replace('Enter', 'Exit');
    } else if (menu_label.indexOf('Exit Full Screen') > 0) {
      pgAdminWindowObject.window.document.querySelector('#mnu_toggle_fullscreen_runtime span').innerHTML = menu_label.replace('Exit', 'Enter');
    }
  }
};

// This function is used to register zoom events.
const registerZoomEvents = () => {
  nw.App.registerGlobalHotKey(zoomInShortcut);
  nw.App.registerGlobalHotKey(zoomOutShortcut);
  nw.App.registerGlobalHotKey(actualSizeShortcut);
  nw.App.registerGlobalHotKey(toggleFullScreenShortcut);
};

// This function is used to unregister zoom events.
const unregisterZoomEvents = () => {
  nw.App.unregisterGlobalHotKey(zoomInShortcut);
  nw.App.unregisterGlobalHotKey(zoomOutShortcut);
  nw.App.unregisterGlobalHotKey(actualSizeShortcut);
  nw.App.unregisterGlobalHotKey(toggleFullScreenShortcut);
};

let ConfigureStore = {
  fileName: configFileName,
  jsonData: {},

  init: function() {
    if (!this.readConfig()){
      this.jsonData = DEFAULT_CONFIG_DATA;
      this.saveConfig();
    }
  },

  // This function is used to write configuration data
  saveConfig: function() {
    fs.writeFileSync(this.fileName, JSON.stringify(this.jsonData, null, 4), {flag: 'w'});
  },

  // This function is used to read the configuration data
  readConfig: function() {
    if (fs.existsSync(this.fileName)) {
      try {
        this.jsonData = JSON.parse(fs.readFileSync(this.fileName));
      } catch (error) {
        /* If the file is not present or invalid JSON data in file */
        this.jsonData = {};
      }
    } else {
      let errMsg = 'Unable to read file ' + this.fileName + ' not found.';
      console.warn(errMsg);
      return false;
    }

    return true;
  },

  getConfigData: function() {
    return this.jsonData;
  },

  get: function(key, if_not_value) {
    if(this.jsonData[key] !== undefined) {
      return this.jsonData[key];
    } else {
      return if_not_value;
    }
  },

  set: function(key, value) {
    if(typeof key === 'object'){
      this.jsonData = {
        ...this.jsonData,
        ...key,
      };
    } else {
      if(value === '' || value == null || typeof(value) == 'undefined') {
        if(this.jsonData[key] !== undefined) {
          delete this.jsonData[key];
        }
      } else {
        this.jsonData[key] = value;
      }
    }
  },
};


module.exports = {
  readServerLog: readServerLog,
  writeServerLog: writeServerLog,
  getAvailablePort: getAvailablePort,
  getPythonPath: getPythonPath,
  setProcessObject: setProcessObject,
  cleanupAndQuitApp: cleanupAndQuitApp,
  getServerLogFile: getServerLogFile,
  getRunTimeConfigFile: getRunTimeConfigFile,
  setPgAdminWindowObject: setPgAdminWindowObject,
  zoomIn: zoomIn,
  zoomOut: zoomOut,
  actualSize: actualSize,
  toggleFullScreen: toggleFullScreen,
  setZoomEvents: setZoomEvents,
  registerZoomEvents: registerZoomEvents,
  unregisterZoomEvents: unregisterZoomEvents,
  setZoomLevelForAllWindows: setZoomLevelForAllWindows,
  ConfigureStore: ConfigureStore,
};
