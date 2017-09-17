/* eslint-env node */
const hrstart = process.hrtime();
const path = require('path');
const webpack = require('webpack');
const utils = require('./webpack/utils');
const localSourceMapDevToolPlugin = require('./webpack/SourceMapDevToolPlugin');
const logger = require('./webpack/logger');
const _ = require('underscore');
const module_name = process.env['PGADMIN_MODULE'];
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const PRODUCTION = process.env.NODE_ENV === 'production';
const envType = PRODUCTION ? 'production': 'development';

logger.detailed_debug(process.env.VERBOSE === 'true');
logger.show_debug(!(process.env.NODEBUG === 'true'));

if (!module_name) {
  logger.error('Environment variable \'PGADMIN_MODULE\' is not defined!');
}

logger.debug('Building the webpack module - \'%s\'...', module_name);

var bundle = utils.loadBundle(module_name);

var res = utils.makeModuleFromBundle(bundle),
  plugins = res.plugins,
  referencePlugins = [];

// First plugin must be the DllPlugin, which will be built at the end.
if (bundle.isReference) {
  plugins.push(
    new webpack.DllPlugin({
      path: bundle.output.manifest,
      name: bundle.name,
      type: 'amd',
    })
  );
}

// Add the other reference plugins
_.each(bundle._order, function(_ref) {
  logger.debug('Creating module reference of \'%s\' module...', _ref);
  var ref_bundle = bundle.references[_ref],
    reference = {
      manifest: require(ref_bundle.output.manifest),
      extensions: ['.js'],
      sourceType: 'amd',
    };

  if (ref_bundle.output.scope) {
    reference['scope'] = ref_bundle.output.scope;
  }
  referencePlugins.unshift(new webpack.DllReferencePlugin(reference));
});

_.each(bundle.references, function(_ref, _name) {
  var referenceJS = path.relative(
    process.cwd(),
    path.join(
      _ref.output.path || path.resolve(
        __dirname, 'pgadmin/static/js/generated/'
      ),
      (_ref.output.filename &&
        _ref.output.filename.replace('[name]', _name)) ||
        `${_ref.name}.js`
    )
  );
  bundle.excludeFromSourceMaps.push(`./${referenceJS}`);
});
res.plugins = plugins = _.union([], plugins, referencePlugins);

// Use the name as reference.
plugins.push(new webpack.NamedModulesPlugin());

// Do we need the Provide Plugin?
if (bundle.provide)
  plugins.push(new webpack.ProvidePlugin(bundle.provide));

// This is a production build.
if (PRODUCTION) {
  // Minify and optimize JS/CSS to reduce bundle size.
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    output: {comments: false},
    compress: {
      warnings: true,
      unused: true,
      dead_code: true,
      drop_console: true,
    },
  }));
  // Optimize CSS Assets by removing comments while bundling
  plugins.push(new OptimizeCssAssetsPlugin({
    assetNameRegExp: /\.css$/g,
    cssProcessor: require('cssnano'),
    cssProcessorOptions: { discardComments: {removeAll: true } },
    canPrint: true,
  }));
  plugins.push(new webpack.optimize.DedupePlugin());
} else {
  plugins.push(new HardSourceWebpackPlugin({
    cacheDirectory: path.resolve(__dirname, 'webpack/.cache/', module_name, envType),
    recordsPath: path.resolve(
      __dirname, 'webpack/.cache', envType, '[name].json'
    ),
    configHash: require('node-object-hash')({sort: false}).hash,
    environmentHash: function() {
      return new Promise(function(resolve, reject) {
        require('fs').readFile(__dirname + '/yarn.lock', 'utf-8', function(err, src) {
          if (err) { return reject(err); }
          resolve(
            require('crypto').createHash('md5').update(src).digest('hex')
          );
        });
      });
    },
  }));
}

if (bundle.createSourceMap) {
  // Helps in debugging each single file, it extracts the module files
  // from bundle so that they are accessible by search in Chrome's sources panel.
  // Reference: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#components/sidebar/sidebar.jsx
  plugins.push(new localSourceMapDevToolPlugin({
    filename: '[filebase].map',
    columns: true,
    exclude: _.union(['static/js/generated', 'node_modules', 'static/css/generated'], bundle.excludeFromSourceMaps),
  }));
}

if (bundle.plugins && _.isArray(bundle.plugins)) {
  res.plugins = _.union([], plugins, bundle.plugins);
}

const hrend = process.hrtime(hrstart);
logger.debug('Configuration building time: %ss %sms', hrend[0], hrend[1]/1000000);

module.exports = res;
