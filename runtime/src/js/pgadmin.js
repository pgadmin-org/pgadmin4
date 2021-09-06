/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const misc = require('../js/misc.js');
const spawn = require('child_process').spawn;

let pgadminServerProcess = null;
let startPageUrl = null;
let serverCheckUrl = null;

let serverPort = 5050;

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

// This function is used to create UUID
function createUUID() {
  let dt = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = (dt + Math.random()*16)%16 | 0;
    dt = Math.floor(dt/16);
    return (c==='x' ? r :(r&0x3|0x8)).toString(16);
  });
}

// This functions is used to start the pgAdmin4 server by spawning a
// separate process.
function startDesktopMode() {
  // Return if pgAdmin server process is already spawned
  // Added check for debugging purpose.
  if (pgadminServerProcess != null)
    return;

  let UUID = createUUID();
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
  Object.keys(process.env).forEach(function(key) {
    misc.writeServerLog('  - ' + key + ': ' + process.env[key]);
  });
  misc.writeServerLog('--------------------------------------------------------\n');

  // Spawn the process to start pgAdmin4 server.
  pgadminServerProcess = spawn(path.resolve(pythonPath), ['-s', path.resolve(pgadminFile)]);
  pgadminServerProcess.on('error', function(err) {
    // Log the error into the log file if process failed to launch
    misc.writeServerLog('Failed to launch pgAdmin4. Error:');
    misc.writeServerLog(err);
  });

  pgadminServerProcess.stdout.setEncoding('utf8');
  pgadminServerProcess.stdout.on('data', (chunk) => {
    misc.writeServerLog(chunk);
  });

  pgadminServerProcess.stderr.setEncoding('utf8');
  pgadminServerProcess.stderr.on('data', (chunk) => {
    if (chunk.indexOf('Runtime Open Configuration') > -1) {
      // Create and launch new window and open pgAdmin url
      nw.Window.open('src/html/configure.html', {
        'frame': true,
        'width': 600,
        'height': 420,
        'position': 'center',
        'resizable': false,
        'focus': true,
        'show': true,
      });
    } else if (chunk.indexOf('Runtime Open View Log') > -1) {
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
    } else if (chunk.indexOf('Runtime Zoom In') >= 0) {
      misc.zoomIn();
    } else if (chunk.indexOf('Runtime Zoom Out') >= 0) {
      misc.zoomOut();
    }  else if (chunk.indexOf('Runtime Actual Size') >= 0) {
      misc.actualSize();
    } else if (chunk.indexOf('Runtime Toggle Full Screen') >= 0) {
      misc.toggleFullScreen();
    } else if (chunk.indexOf('Runtime new window opened') >= 0) {
      misc.setZoomLevelForAllWindows();
    } else {
      misc.writeServerLog(chunk);
    }
  });

  // This function is used to ping the pgAdmin4 server whether it
  // it is started or not.
  function pingServer() {
    return axios.get(serverCheckUrl);
  }

  let connectionTimeout = misc.ConfigureStore.get('connectionTimeout', 90) * 1000;
  let currentTime = (new Date).getTime();
  let endTime =  currentTime + connectionTimeout;
  let midTime1 = currentTime + (connectionTimeout/2);
  let midTime2 = currentTime + (connectionTimeout*2/3);
  let pingInProgress = false;

  // ping pgAdmin server every 1 second.
  let intervalID = setInterval(function() {
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
        if(curTime < midTime2) {
          document.getElementById('loader-text-status').innerHTML = 'Taking longer than usual...';
        } else {
          document.getElementById('loader-text-status').innerHTML = 'Almost there...';
        }
      } else {
        document.getElementById('loader-text-status').innerHTML = 'Waiting for pgAdmin 4 to start...';
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
  }, (pgadminWindow)=> {
    // Set pgAdmin4 Windows Object
    misc.setPgAdminWindowObject(pgadminWindow);

    // Set the zoom level stored in the config file.
    pgadminWindow.zoomLevel = misc.ConfigureStore.get('zoomLevel', 0);

    // Set zoom in and out events.
    misc.setZoomEvents();

    pgadminWindow.on('closed', function() {
      misc.cleanupAndQuitApp();
    });

    // set up handler for new-win-policy event.
    // Set the width and height for the new window.
    pgadminWindow.on('new-win-policy', function(frame, url, policy) {
        if(!frame) {
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
    });

    pgadminWindow.on('loaded', function() {
      /* Make the new window opener to null as it is
       * nothing but a splash screen. We will have to make it null,
       * so that open in new browser tab will work.
       */
      pgadminWindow.window.opener = null;

      // Show new window
      pgadminWindow.show();
      pgadminWindow.focus();

      // Hide the splash screen
      splashWindow.hide();
    });

    pgadminWindow.on('blur',  function() {
      misc.unregisterZoomEvents();
    });

    pgadminWindow.on('focus', function() {
      misc.registerZoomEvents();
    });
  });
}

// Get the gui object of NW.js
let gui = require('nw.gui');
let splashWindow = gui.Window.get();

// Always clear the cache before starting the application.
nw.App.clearCache();

// Create Mac Builtin Menu
if (platform() === 'darwin') {
  let macMenu = new  gui.Menu({type: 'menubar'});
  macMenu.createMacBuiltin('pgAdmin 4');
  splashWindow.menu = macMenu;
}

splashWindow.on('loaded', function() {
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

splashWindow.on('close', function() {
  misc.cleanupAndQuitApp();
});
