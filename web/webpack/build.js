const processstart = process.hrtime(),
  child_process = require('child_process'),
  path = require('path'),
  script_directory = path.resolve(__dirname, '..'),
  _ = require('underscore'),
  logger = require('./logger');

var argv = require('minimist')(process.argv.slice(2)),
  /* Modules dependency graph */
  modules = {
    'codemirror': {modules: []},
    'react': {modules: []},
    'vendor': {modules: []},
    'slickgrid': {modules: ['vendor']},
    'core': {modules: ['vendor', 'codemirror']},
    'nodes': {modules: ['core']},
    'tools': {modules: ['nodes']},
    'app': {modules: ['core']},
    'sqleditor': {modules: ['react', 'nodes']},
    'debugger': {modules: ['codemirror', 'nodes']},
    'tools_nodes': {modules: ['tools', 'nodes']}
  },
  script_args = argv.production ? '-p' : '';

const verbose = argv.verbose? true : false,
  nodebug = argv.nodebug ? true : false,
  log_local = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    logger.show_prefix(true);
    fn.apply(undefined, args);
    logger.show_prefix(false);
  };

if (argv.module) {
  modules ={};
  modules[argv.module] = {modules: []};
}

function usage(_msg) {
  logger.show_prefix(false);
  logger.detailed_debug(true);
  if (_msg) {
    logger.warning(_msg);
    logger.debug2('');
  }
  logger.info(`node ${path.resolve(__dirname, 'build.js')} [options]`);
  logger.debug(`options:`);
  logger.debug2(' --module Build the specified module only');
  logger.debug2(' --production Generated a production build');
  logger.debug2(' --verbose Show detailed debug messages');
  logger.debug2(' --wait Run the webpack in wait mode.');
  logger.debug2(' --progress Show compilation progress in percentage.');
  logger.debug2(' --help Print the usage help');
  logger.debug2('');
  logger.info('NOTE:');
  logger.debug2('  \'--module\' must specify with \'--wait\' option.');

  process.exit(_msg ? 1 : 0);
}

if (argv.help) {
  usage();
}

if (argv.wait) {
  if (!argv.module) {
    usage('You must specify the module to be built when used with the \'--wait\' option.');
  }
  script_args = `-w ${script_args}`;
}

if (argv.progress) {
  script_args = `--progress ${script_args}`;
}

logger.show_debug(!nodebug);
logger.show_prefix(false);
logger.detailed_debug(verbose);

log_local(logger.debug2, `Script directory: ${script_directory}`);



function build(_name) {
  const hrstart = process.hrtime();
  log_local(logger.info, `+++ Building the module - '${_name}'...`);
  var cp = child_process.exec(
    `node ./node_modules/webpack/bin/webpack.js ${script_args} --config webpack.config.js`,
    {
      env: Object.assign({}, process.env, {
        PGADMIN_MODULE: _name,
        VERBOSE: !!verbose,
        NODEBUG: !!argv.nodebug
      }),
      cwd: script_directory
    },
    function(_err, _stdout, _stderr) {
      if (_err) {
        logger.warning('Error building the module - \'%s\' with error code: %d!', _name, _err.code);
        logger.error(_err);
      }
      const hrend = process.hrtime(hrstart);
      log_local(
        logger.info, '+++ Module Built! (Name: %s, Time: %sms)',
        _name, parseInt((hrend[0] * 1000) + hrend[1]/1e6)
      );

      // Remove this module from the list
      delete modules[_name];
      _.each(modules, function(_m) {
        var idx = _m.modules[_name];

        if (idx !== -1) {
          _m.modules.splice(idx, 1);
        }
      });
      setTimeout(_build_stand_alone, 1);
    },
    function(_err) {
      if (_err && _err.stack);
      logger.warning(_stack);
      logger.error('Error building the module - \'%s\'', _name);
    }
  );
  cp.stdout && cp.stdout.setEncoding('utf-8');
  cp.stderr && cp.stderr.setEncoding('utf-8');

  cp.stdout && cp.stdout.on('data', function(_output) {
    logger.debug(_output.trim());
  });
  cp.stderr && cp.stderr.on('data', function(_error) {
    logger.warning(_error.trim());
  });
}

function _build_stand_alone() {
  for(var name in modules) {
    var _m = modules[name];

    if (_m.modules.length === 0) {
      setTimeout(function() {build(name);}, 1);
      return;
    }
  }
  if (Object.keys(modules).length) {
    logger.error(
      'There are still modules (%s) to be built on unknown dependency.',
      JSON.stringify(modules)
    );
  }
  const hrend = process.hrtime(processstart);
  log_local(logger.info, 'Done!');
  log_local(
    logger.info,
    'Build Time: %s seconds', hrend[0] + (parseInt(hrend[1]/1e6)/1e3)
  );
}

_build_stand_alone();
