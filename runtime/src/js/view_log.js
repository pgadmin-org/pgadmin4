/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const misc = require('../js/misc.js');

// Get the window object of view log window
let gui = require('nw.gui');
let logWindow = gui.Window.get();

logWindow.on('loaded', function() {
  document.getElementById('status-text').innerHTML = '';
  document.getElementById('server_log_label').innerHTML = 'Server Log: ' + '(' + misc.getServerLogFile() + ')';
  document.getElementById('server_log').innerHTML = misc.readServerLog();
  document.getElementById('btnReload').addEventListener('click', function() {
    document.getElementById('server_log').innerHTML = 'Loading logs...';
    setTimeout(function() {
      document.getElementById('server_log').innerHTML = misc.readServerLog();
    }, 500);
    document.getElementById('status-text').innerHTML = 'Logs reloaded successfully';
  });
});
