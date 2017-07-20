/* eslint-env node */
// Import file, libraries and plugins
const path = require('path');
const webpack = require('webpack');
const sourceDir = __dirname + '/pgadmin/static';
// webpack.shim.js contains path references for resolve > alias configuration
// and other util function used in CommonsChunksPlugin.
const webpackShimConfig = require('./webpack.shim');
const PRODUCTION = process.env.NODE_ENV === 'production';
const envType = PRODUCTION ? 'prod': 'dev';
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractStyle = new ExtractTextPlugin('style.css');
const extractSass = new ExtractTextPlugin('pgadmin.css');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

// Extract vendor related libraries(node_modules/lib/lib.js) from bundles
// specified in `chunks` into vendor.js bundle
const vendorChunks = new webpack.optimize.CommonsChunkPlugin({
  name: 'vendor',
  chunks: ['app.bundle', 'sqleditor', 'codemirror', 'debugger_direct'],
  filename: 'vendor.js',
  minChunks: function(module) {
    return webpackShimConfig.isExternal(module);
  },
});

// Extract pgAdmin common libraries(pgadmin/web/module/filename.js) from bundles
// specified in `chunks` into pgadmin_commons.js bundle.
// pgLibs holds files that will be moved into this bundle.
const pgAdminCommonChunks = new webpack.optimize.CommonsChunkPlugin({
  name: 'pgadmin_commons',
  chunks: ['app.bundle', 'sqleditor', 'codemirror', 'debugger_direct'],
  filename: 'pgadmin_commons.js',
  minChunks: function(module) {
    return webpackShimConfig.isPgAdminLib(module);
  },
});

// Expose libraries in app context so they need not to
// require('libname') when used in a module
const providePlugin = new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery',
  'window.jQuery': 'jquery',
  _: 'underscore',
  S: 'underscore.string',
  Backbone: 'backbone',
  Backgrid: 'backgrid',
  pgAdmin: 'pgadmin',
});

// Minify and omptimize JS/CSS to reduce bundle size. It is used in production
const uglifyPlugin = new webpack.optimize.UglifyJsPlugin({
  output: {comments: false},
  compress: {
    warnings: true,
    unused: true,
    dead_code: true,
    drop_console: true,
  },
});

// Optimize CSS Assets by removing comments while bundling
const optimizeAssetsPlugin = new OptimizeCssAssetsPlugin({
  assetNameRegExp: /\.css$/g,
  cssProcessor: require('cssnano'),
  cssProcessorOptions: { discardComments: {removeAll: true } },
  canPrint: true,
});

// Helps in minimising the `React' production bundle. Bundle only code
// requires in production mode. React keeps the code conditional
// based on 'NODE_ENV' variable. [used only in production]
const definePlugin = new webpack.DefinePlugin({
  'process.env': {
    'NODE_ENV': JSON.stringify('production'),
  },
});

// Manages the cache and stores it into 'sources/generated/.cache/<env><hash>/' path
// where env = dev || prod
const hardSourceWebpackPlugin = new HardSourceWebpackPlugin({
  cacheDirectory: './.cache/hard-source/' + envType +'/[confighash]',
  recordsPath: './.cache/hard-source/' + envType +'/[confighash]/records.json',
  configHash: require('node-object-hash')({sort: false}).hash,
  environmentHash: {
    root: process.cwd(),
    directories: ['node_modules'],
    files: ['package.json'],
  },
});

module.exports = {
  stats: { children: false },
  // The base directory, an absolute path, for resolving entry points and loaders
  // from configuration.
  context: __dirname,
  // Specify entry points of application
  entry: {
    'app.bundle': sourceDir + '/bundle/app.js',
    codemirror: sourceDir + '/bundle/codemirror.js',
    sqleditor: './pgadmin/tools/sqleditor/templates/sqleditor/js/sqleditor.js',
    debugger_direct: './pgadmin/tools/debugger/templates/debugger/js/direct.js',
    file_utils: './pgadmin/misc/file_manager/templates/file_manager/js/utility.js',
    pgadmin_css: './pgadmin/static/scss/pgadmin.scss',
    style_css: './pgadmin/static/css/style.css',
  },
  // path: The output directory for generated bundles(defined in entry)
  // Ref: https://webpack.js.org/configuration/output/#output-library
  output: {
    libraryTarget: 'amd',
    path: __dirname + '/pgadmin/static/js/generated',
    filename: '[name].js',
    libraryExport: 'default',
  },
  // Templates files which contains python code needs to load dynamically
  // Such files specified in externals are loaded at first and defined in
  // the start of generated bundle within define(['libname'],fn) etc.
  externals: {
    'pgadmin.browser.messages': 'pgadmin.browser.messages',
    'pgadmin.browser.utils': 'pgadmin.browser.utils',
    'pgadmin.browser.endpoints': 'pgadmin.browser.endpoints',
    'pgadmin.server.supported_servers': 'pgadmin.server.supported_servers',
    'pgadmin.user_management.current_user': 'pgadmin.user_management.current_user',
    'pgadmin.node.unique_key': 'pgadmin.node.unique_key',
    'translations': 'translations',
  },
  module: {
    // References:
    // Module and Rules: https://webpack.js.org/configuration/module/
    // Loaders: https://webpack.js.org/loaders/
    //
    // imports-loader: it adds dependent modules(use:imports-loader?module1)
    // at the beginning of module it is dependency of like:
    // var jQuery = require('jquery'); var browser = require('pgadmin.browser')
    // It solves number of problems
    // Ref: http:/github.com/webpack-contrib/imports-loader/
    rules: [{
      test: /\.jsx?$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['es2015', 'react'],
        },
      },
    }, {
      // Transforms the code in a way that it works in the webpack environment.
      // It uses imports-loader internally to load dependency. Its
      // configuration is specified in webpack.shim.js
      // Ref: https://www.npmjs.com/package/shim-loader
      test: /\.js/,
      loader: 'shim-loader',
      query: webpackShimConfig,
      include: path.join(__dirname, '/pgadmin/browser'),
    }, {
      test: require.resolve('./pgadmin/tools/datagrid/templates/datagrid/js/datagrid'),
      use: {
        loader: 'imports-loader?' +
        'pgadmin.dashboard' +
        ',pgadmin.tools.user_management' +
        ',misc.statistics' +
        ',misc.depends' +
        ',misc.sql' +
        ',misc.bgprocess' +
        ',pgadmin.node.server_group' +
        ',pgadmin.node.server' +
        ',pgadmin.node.database' +
        ',pgadmin.node.role' +
        ',pgadmin.node.cast' +
        ',pgadmin.node.tablespace' +
        ',pgadmin.node.resource_group' +
        ',pgadmin.node.event_trigger' +
        ',pgadmin.node.extension' +
        ',pgadmin.node.language' +
        ',pgadmin.node.foreign_data_wrapper' +
        ',pgadmin.node.schema' +
        ',pgadmin.node.catalog' +
        ',pgadmin.node.catalog_object' +
        ',pgadmin.node.collation' +
        ',pgadmin.node.domain' +
        ',pgadmin.node.domain_constraints' +
        ',pgadmin.node.foreign_table' +
        ',pgadmin.node.fts_configuration' +
        ',pgadmin.node.fts_dictionary' +
        ',pgadmin.node.fts_parser' +
        ',pgadmin.node.fts_template' +
        ',pgadmin.node.function' +
        ',pgadmin.node.procedure' +
        ',pgadmin.node.edbfunc' +
        ',pgadmin.node.edbproc' +
        ',pgadmin.node.edbvar' +
        ',pgadmin.node.edbvar' +
        ',pgadmin.node.trigger_function' +
        ',pgadmin.node.package' +
        ',pgadmin.node.sequence' +
        ',pgadmin.node.synonym' +
        ',pgadmin.node.type' +
        ',pgadmin.node.rule' +
        ',pgadmin.node.index' +
        ',pgadmin.node.trigger' +
        ',pgadmin.node.catalog_object_column' +
        ',pgadmin.node.view' +
        ',pgadmin.node.mview' +
        ',pgadmin.node.table',
      },
    }, {
      test: require.resolve('./node_modules/acitree/js/jquery.aciTree.min'),
      use: {
        loader: 'imports-loader?this=>window',
      },
    }, {
      test: require.resolve('./node_modules/acitree/js/jquery.aciPlugin.min'),
      use: {
        loader: 'imports-loader?this=>window',
      },
    }, {
      test: require.resolve('./pgadmin/static/bundle/browser'),
      use: {
        loader: 'imports-loader?' +
        'pgadmin.about' +
        ',pgadmin.preferences' +
        ',misc.file_manager' +
        ',pgadmin.settings' +
        ',tools.backup' +
        ',tools.restore' +
        ',tools.grant_wizard' +
        ',tools.maintenance' +
        ',tools.import_export' +
        ',tools.debugger' +
        ',tools.direct',
      },
    }, {
      test: require.resolve('snapsvg'),
      use: {
        loader: 'imports-loader?this=>window,fix=>module.exports=0',
      },
    }, {
      test: /\.(jpe?g|png|gif|svg)$/i,
      loaders: [
        'file-loader?hash=sha512&digest=hex&name=img/[name].[ext]', {
          loader: 'image-webpack-loader',
          query: {
            bypassOnDebug: true,
            mozjpeg: {
              progressive: true,
            },
            gifsicle: {
              interlaced: false,
            },
            optipng: {
              optimizationLevel: 7,
            },
            pngquant: {
              quality: '75-90',
              speed: 3,
            },
          },
        },
      ],
      exclude: /vendor/,
    }, {
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader?name=fonts/[name].[ext]',
      exclude: /vendor/,
    }, {
      test: /\.scss$/,
      use: extractSass.extract({
        use: [{
          loader: 'css-loader',
        }, {
          loader: 'sass-loader', // compiles Sass to CSS
          options: {
            includePaths: ['./pgadmin/static/scss/'],
          },
        }],
      }),
    }, {
      test: /\.css$/,
      use: extractStyle.extract({
        use: [{
          loader: 'css-loader',
        }],
      }),
    }],
    // Prevent module from parsing through webpack, helps in reducing build time
    noParse: [/moment.js/],
  },
  resolve: {
    alias: webpackShimConfig.resolveAlias,
    modules: ['node_modules', '.'],
    extensions: ['.js', '.jsx'],
    unsafeCache: true,
  },
  // Define list of Plugins used in Production or development mode
  // Ref:https://webpack.js.org/concepts/plugins/#components/sidebar/sidebar.jsx
  plugins: PRODUCTION ? [
    extractSass,
    extractStyle,
    vendorChunks,
    pgAdminCommonChunks,
    providePlugin,
    uglifyPlugin,
    optimizeAssetsPlugin,
    definePlugin,
    hardSourceWebpackPlugin,
  ]: [
    extractSass,
    extractStyle,
    vendorChunks,
    pgAdminCommonChunks,
    providePlugin,
    hardSourceWebpackPlugin,
  ],
};
