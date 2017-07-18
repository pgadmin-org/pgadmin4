/* eslint-env node */
const path = require('path');
const webpack = require('webpack');
const webpackShimConfig = require('./webpack.shim');
const PRODUCTION = process.env.NODE_ENV === 'production';
const envType = PRODUCTION ? 'prod': 'dev';
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const sourceDir = __dirname + '/pgadmin/static';
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractLib = new ExtractTextPlugin('style.css');
const extractSass = new ExtractTextPlugin('pgadmin.css');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

const vendorChunks = new webpack.optimize.CommonsChunkPlugin({
  name: 'vendor',
  chunks: ['app.bundle', 'sqleditor', 'codemirror', 'debugger_direct'],
  filename: 'vendor.js',
  minChunks: function(module) {
    return webpackShimConfig.isExternal(module);
  },
});

const pgAdminCommonChunks = new webpack.optimize.CommonsChunkPlugin({
  name: 'pgadmin_commons',
  chunks: ['app.bundle', 'sqleditor', 'codemirror', 'debugger_direct'],
  filename: 'pgadmin_commons.js',
  minChunks: function(module) {
    return webpackShimConfig.isPgAdminLib(module);
  },
});

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

const uglifyPlugin = new webpack.optimize.UglifyJsPlugin({
  output: {comments: false},
  compress: {
    warnings: false,
    unused: true,
    dead_code: true,
    drop_console: true,
  },
});

const optimizeAssetsPlugin = new OptimizeCssAssetsPlugin({
  assetNameRegExp: /\.css$/g,
  cssProcessor: require('cssnano'),
  cssProcessorOptions: { discardComments: {removeAll: true } },
  canPrint: true,
});

const definePlugin = new webpack.DefinePlugin({
  'process.env': {
    'NODE_ENV': JSON.stringify('production'),
  },
});

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
  context: __dirname,
  entry: {
    'app.bundle': sourceDir + '/bundle/app.js',
    codemirror: sourceDir + '/bundle/codemirror.js',
    sqleditor: './pgadmin/tools/sqleditor/templates/sqleditor/js/sqleditor.js',
    debugger_direct: './pgadmin/tools/debugger/templates/debugger/js/direct.js',
    file_utils: './pgadmin/misc/file_manager/templates/file_manager/js/utility.js',
    pgadmin_css: './pgadmin/static/scss/pgadmin.scss',
    lib_css: './pgadmin/static/css/lib.css',
  },
  output: {
    libraryTarget: 'amd',
    path: __dirname + '/pgadmin/static/js/generated',
    filename: '[name].js',
    libraryExport: 'default',
  },
  /*Templates files to be loaded dynamically*/
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
      use: extractLib.extract({
        use: [{
          loader: 'css-loader',
        }],
      }),
    }],
    noParse: [/moment.js/],
  },
  resolve: {
    alias: webpackShimConfig.resolveAlias,
    modules: ['node_modules', '.'],
    extensions: ['.js', '.jsx'],
    unsafeCache: true,
  },
  plugins: PRODUCTION ? [
    extractSass,
    extractLib,
    vendorChunks,
    pgAdminCommonChunks,
    providePlugin,
    uglifyPlugin,
    optimizeAssetsPlugin,
    definePlugin,
    hardSourceWebpackPlugin,
  ]: [
    extractSass,
    extractLib,
    vendorChunks,
    pgAdminCommonChunks,
    providePlugin,
    hardSourceWebpackPlugin,
  ],
};
