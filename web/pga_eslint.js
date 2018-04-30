#!/usr/bin/env node

/* eslint no-console:off */
/* eslint no-undef:off */
'use strict';

const debug = (process.argv.indexOf('--debug') > -1),
  file_argv = process.argv.indexOf('--file');
var argv = process.argv;

if (file_argv > -1) {
  argv.splice(file_argv, 1);
} else {
  argv = argv.concat(['--ignore-pattern', __filename]);
}

// must do this initialization *before* other requires in order to work
if (debug) {
  require('debug').enable('eslint:*,-eslint:code-path');
}

const fs = require('fs');
const path = require('path');
const read = (dir) =>
  fs.readdirSync(dir)
  .reduce((files, file) =>
    fs.statSync(path.join(dir, file)).isDirectory() ?
    files.concat(read(path.join(dir, file))) :
    ((file, files) => (
      file.indexOf(path.sep + 'generated' + path.sep) === -1 &&
      file.indexOf(path.sep + 'vendor' + path.sep) === -1 &&
      file.indexOf(path.sep + 'static' + path.sep) > -1 &&
      (file.endsWith('.js') || file.endsWith('.jsx')) &&
      files.concat(file) || files
    ))(path.join(dir, file), files), []),
  eslint_cli = require('eslint/lib/cli');

process.exitCode = eslint_cli.execute(
  file_argv > -1 ? argv : argv.concat(
    read(path.join(__dirname, 'pgadmin'))
  ).concat(
    ['regression/javascript/**/*.jsx','regression/javascript/**/*.js','*.js']
  )
);
