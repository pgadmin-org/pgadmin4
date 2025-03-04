/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import axios from 'axios';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import * as misc from './misc.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { setupMenu } from './menu.js';
import contextMenu from 'electron-context-menu';
import { CancelError, download } from 'electron-dl';

const configStore = new Store({
  defaults: {
    fixedPort: false,
    portNo: 5050,
    connectionTimeout: 180,
    openDocsInBrowser: true,
  },
});
let pgadminServerProcess = null;
let startPageUrl = null;
let serverCheckUrl = null;
let pgAdminMainScreen = null;

let serverPort = 5050;
let appStartTime = (new Date()).getTime();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let docsURLSubStrings = ['www.enterprisedb.com', 'www.postgresql.org', 'www.pgadmin.org', 'help/help'];

process.env['ELECTRON_ENABLE_SECURITY_WARNINGS'] = false;

// Paths to the rest of the app
let [pythonPath, pgadminFile] = misc.getAppPaths(__dirname);

// Do not allow a second instance of pgAdmin to run.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (pgAdminMainScreen) {
      if (pgAdminMainScreen.isMinimized()) pgAdminMainScreen.restore();
      pgAdminMainScreen.focus();
    }
  });
}

// Override the paths above, if a developer needs to
if (fs.existsSync('dev_config.json')) {
  try {
    let dev_config = JSON.parse(fs.readFileSync('dev_config.json'));
    pythonPath = path.resolve(dev_config['pythonPath']);
    pgadminFile = path.resolve(dev_config['pgadminFile']);
  } catch (error) {
    console.error('Failed to load dev_config', error);
  }
}

contextMenu({
  showInspectElement: false,
  showSearchWithGoogle: false,
  showLookUpSelection: false,
  showSelectAll: true,
});

Menu.setApplicationMenu(null);

function openConfigure() {
  const win = new BrowserWindow({
    show: false,
    width: 600,
    height: 580,
    position: 'center',
    resizable: false,
    icon: '../../assets/pgAdmin4.png',
    webPreferences: {
      preload: path.join(__dirname, 'other_preload.js'),
    },
  });
  win.loadFile('./src/html/configure.html');
  win.once('ready-to-show', ()=>{
    win.show();
  });
}

function showErrorDialog(intervalID) {
  if(!splashWindow.isVisible()) {
    return;
  }
  clearInterval(intervalID);
  splashWindow.close();

  new BrowserWindow({
    'frame': true,
    'width': 800,
    'height': 450,
    'position': 'center',
    'resizable': false,
    'focus': true,
    'show': true,
    icon: '../../assets/pgAdmin4.png',
    webPreferences: {
      preload: path.join(__dirname, 'other_preload.js'),
    },
  }).loadFile('./src/html/server_error.html');
}

function reloadApp() {
  const currWin = BrowserWindow.getFocusedWindow();

  const preventUnload = (event) => {
    event.preventDefault();
    currWin.webContents.off('will-prevent-unload', preventUnload);
  };
  currWin.webContents.on('will-prevent-unload', preventUnload);
  currWin.webContents.reload();
}

async function desktopFileDownload(payload) {
  const currWin = BrowserWindow.getFocusedWindow();
  try {
    await download(currWin, payload.downloadUrl, {
      filename: payload.fileName,
      saveAs: payload.prompt_for_download_location,
      onProgress: (progress) => {
        currWin.webContents.send('download-progress', progress);
      },
      onCompleted: (item) => {
        currWin.webContents.send('download-complete', item);
        if (payload.automatically_open_downloaded_file)
          shell.openPath(item.path);
      },
    });
  } catch (error) {
    if (!(error instanceof CancelError)) {
      misc.writeServerLog(error);
    }
  }
}

// This functions is used to start the pgAdmin4 server by spawning a
// separate process.
function startDesktopMode() {
  // Return if pgAdmin server process is already spawned
  // Added check for debugging purpose.
  if (pgadminServerProcess != null)
    return;

  let pingIntervalID;
  let UUID = crypto.randomUUID();
  // Set the environment variables so that pgAdmin 4 server
  // starts listening on the appropriate port.
  process.env.PGADMIN_INT_PORT = serverPort;
  process.env.PGADMIN_INT_KEY = UUID;
  process.env.PGADMIN_SERVER_MODE = 'OFF';

  // Start Page URL
  startPageUrl = 'http://127.0.0.1:' + serverPort + '/?key=' + UUID;
  serverCheckUrl = 'http://127.0.0.1:' + serverPort + '/misc/ping?key=' + UUID;

  // Write Python Path, pgAdmin file path and command in log file.
  misc.writeServerLog('pgAdmin Runtime Environment');
  misc.writeServerLog('--------------------------------------------------------');
  let command = pythonPath + ' -s ' + pgadminFile;
  misc.writeServerLog('Python Path: "' + pythonPath + '"');
  misc.writeServerLog('Runtime Config File: "' + path.resolve(configStore.path) + '"');
  misc.writeServerLog('Webapp Path: "' + pgadminFile + '"');
  misc.writeServerLog('pgAdmin Command: "' + command + '"');
  misc.writeServerLog('Environment: ');
  Object.keys(process.env).forEach(function (key) {
    // Below code is included only for Mac OS as default path for azure CLI
    // installation path is not included in PATH variable while spawning
    // runtime environment.
    if (process.platform === 'darwin' && key === 'PATH') {
      let updated_path = process.env[key] + ':/usr/local/bin';
      process.env[key] = updated_path;
    }

    if (process.platform === 'win32' && key.toUpperCase() === 'PATH') {
      let _libpq_path = path.join(path.dirname(path.dirname(path.resolve(pgadminFile))), 'runtime');
      process.env[key] = _libpq_path + ';' + process.env[key];
    }

    misc.writeServerLog('  - ' + key + ': ' + process.env[key]);
  });
  misc.writeServerLog('--------------------------------------------------------\n');

  // Spawn the process to start pgAdmin4 server.
  let spawnStartTime = (new Date).getTime();
  pgadminServerProcess = spawn(pythonPath, ['-s', pgadminFile]);
  pgadminServerProcess.on('error', function (err) {
    // Log the error into the log file if process failed to launch
    misc.writeServerLog('Failed to launch pgAdmin4. Error:');
    misc.writeServerLog(err);
    showErrorDialog(pingIntervalID);
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

  let connectionTimeout = configStore.get('connectionTimeout', 180) * 1000;
  let currentTime = (new Date).getTime();
  let endTime = currentTime + connectionTimeout;
  let midTime1 = currentTime + (connectionTimeout / 2);
  let midTime2 = currentTime + (connectionTimeout * 2 / 3);
  let pingInProgress = false;

  // ping pgAdmin server every 1 second.
  let pingStartTime = (new Date).getTime();
  pingIntervalID = setInterval(function () {
    // If ping request is already send and response is not
    // received no need to send another request.
    if (pingInProgress)
      return;

    pingServer().then(() => {
      pingInProgress = false;
      splashWindow.webContents.executeJavaScript('document.getElementById(\'loader-text-status\').innerHTML = \'pgAdmin 4 started\';', true);
      // Set the pgAdmin process object to misc
      misc.setProcessObject(pgadminServerProcess);

      clearInterval(pingIntervalID);
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
        showErrorDialog(pingIntervalID);
      }

      if (curTime > midTime1) {
        if (curTime < midTime2) {
          splashWindow.webContents.executeJavaScript('document.getElementById(\'loader-text-status\').innerHTML = \'Taking longer than usual...\';', true);
        } else {
          splashWindow.webContents.executeJavaScript('document.getElementById(\'loader-text-status\').innerHTML = \'Almost there...\';', true);
        }
      }
    });

    pingInProgress = true;
  }, 1000);
}

// This function is used to hide the splash screen and create/launch
// new window to render pgAdmin4 page.
function launchPgAdminWindow() {
  // Create and launch new window and open pgAdmin url
  misc.writeServerLog('Application Server URL: ' + startPageUrl);
  pgAdminMainScreen = new BrowserWindow({
    'id': 'pgadmin-main',
    'icon': '../../assets/pgAdmin4.png',
    'frame': true,
    'position': 'center',
    'resizable': true,
    'minWidth': 640,
    'minHeight': 480,
    'width': 1024,
    'height': 768,
    'focus': true,
    'show': false,
    webPreferences: {
      nodeIntegrationInSubFrames: true,
      preload: path.join(__dirname, 'pgadmin_preload.js'),
    },
  });

  splashWindow.close();
  pgAdminMainScreen.webContents.session.clearCache();

  setupMenu(pgAdminMainScreen, {
    'view_logs': ()=>{
      const win = new BrowserWindow({
        show: false,
        width: 800,
        height: 460,
        position: 'center',
        resizable: false,
        icon: '../../assets/pgAdmin4.png',
        webPreferences: {
          preload: path.join(__dirname, 'other_preload.js'),
        },
      });
      win.loadFile('./src/html/view_log.html');
      win.once('ready-to-show', ()=>{
        win.show();
      });
    },
    'configure': openConfigure,
    'reloadApp': reloadApp,
  });

  pgAdminMainScreen.loadURL(startPageUrl);
  pgAdminMainScreen.setBounds(configStore.get('bounds'));
  pgAdminMainScreen.show();

  pgAdminMainScreen.webContents.setWindowOpenHandler(({url})=>{
    let openDocsInBrowser = configStore.get('openDocsInBrowser', true);
    let isDocURL = false;
    docsURLSubStrings.forEach(function (key) {
      if (url.indexOf(key) >= 0) {
        isDocURL = true;
      }
    });

    if (openDocsInBrowser && isDocURL) {
      // Do not open the window
      shell.openExternal(url);
      return { action: 'deny' };
    } else {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          'position': 'center',
          'minWidth': 640,
          'minHeight': 480,
          icon: '../../assets/pgAdmin4.png',
          ...pgAdminMainScreen.getBounds(),
          webPreferences: {
            preload: path.join(__dirname, 'pgadmin_preload.js'),
          },
        },
      };
    }
  });

  pgAdminMainScreen.on('closed', ()=>{
    misc.cleanupAndQuitApp();
  });

  pgAdminMainScreen.on('close', () => {
    configStore.set('bounds', pgAdminMainScreen.getBounds());
    pgAdminMainScreen.removeAllListeners('close');
    pgAdminMainScreen.close();
  });
}

let splashWindow;

// setup preload events.
ipcMain.handle('showOpenDialog', (e, options) => dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), options));
ipcMain.handle('showSaveDialog', (e, options) => dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), options));
ipcMain.handle('showMessageBox', (e, options) => dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender), options));
ipcMain.handle('getStoreData', (_e, key) => key ? configStore.get(key) : configStore.store);
ipcMain.handle('setStoreData', (_e, newValues) => {
  configStore.store = {
    ...configStore.store,
    ...newValues,
  };
});
ipcMain.handle('getServerLogFile', () => misc.getServerLogFile());
ipcMain.handle('readServerLog', () => misc.readServerLog());
ipcMain.on('restartApp', ()=>{
  app.relaunch();
  app.exit(0);
});
ipcMain.on('log', (text) => ()=>{
  misc.writeServerLog(text);
});
ipcMain.on('reloadApp', reloadApp);
ipcMain.on('onFileDownload', (_, payload) => desktopFileDownload(payload));
ipcMain.handle('checkPortAvailable', async (_e, fixedPort)=>{
  try {
    await misc.getAvailablePort(fixedPort);
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle('openConfigure', openConfigure);

app.whenReady().then(() => {
  splashWindow = new BrowserWindow({
    transparent: true,
    width: 750,
    height: 600,
    frame: false,
    movable: true,
    focusable: true,
    resizable: false,
    show: false,
    icon: '../../assets/pgAdmin4.png',
  });

  splashWindow.loadFile('./src/html/splash.html');
  splashWindow.center();

  splashWindow.on('show', function () {
    let fixedPortCheck = configStore.get('fixedPort', false);
    if (fixedPortCheck) {
      serverPort = configStore.get('portNo');
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
            dialog.showErrorBox('Error', 'The port specified is already in use. Please enter a free port number.');
          } else {
            dialog.showErrorBox('Error', errCode.toString());
          }
          splashWindow.close();
        });
    }
  });

  splashWindow.show();
});