/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const misc = require('../js/misc.js');

// Get the window object of server error window
let gui = require('nw.gui');
let errorWindow = gui.Window.get();

errorWindow.on('loaded', function() {
  document.getElementById('server_error_label').innerHTML = 'The pgAdmin 4 server could not be contacted:';
  document.getElementById('server_error_log').innerHTML = misc.readServerLog();
  document.getElementById('btnConfigure').addEventListener('click', function() {
    nw.Window.open('src/html/configure.html', {
      'frame': true,
      'width': 600,
      'height': 420,
      'position': 'center',
      'resizable': false,
      'focus': true,
      'show': true,
    });
  });
});

errorWindow.on('close', function() {
  misc.cleanupAndQuitApp();
});
