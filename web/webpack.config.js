/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-env node */
// Import file, libraries and plugins
const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const sourceDir = __dirname + '/pgadmin/static';
// webpack.shim.js contains path references for resolve > alias configuration
// and other util function used in CommonsChunksPlugin.
const webpackShimConfig = require('./webpack.shim');
const PRODUCTION = process.env.NODE_ENV === 'production';
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const extractStyle = new MiniCssExtractPlugin({
  filename: '[name].css',
  allChunks: true,
});
const envType = PRODUCTION ? 'production': 'development';
const devToolVal = PRODUCTION ? false : 'eval';
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

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
  'moment': 'moment',
  'window.moment':'moment',
});

// Optimize CSS Assets by removing comments while bundling
const optimizeAssetsPlugin = new OptimizeCssAssetsPlugin({
  assetNameRegExp: /\.css$/g,
  cssProcessor: require('cssnano'),
  cssProcessorOptions: { discardComments: {removeAll: true } },
  canPrint: true,
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

// Helps in debugging each single file, it extracts the module files
// from bundle so that they are accessible by search in Chrome's sources panel.
// Reference: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#components/sidebar/sidebar.jsx
const sourceMapDevToolPlugin = new webpack.SourceMapDevToolPlugin({
  filename: '[name].js.map',
  exclude: ['vendor.js', 'codemirror.js', 'popper.js'],
  columns: false,
});



function cssToBeSkiped(curr_path) {
  /** Skip all templates **/
  if(curr_path.indexOf('template') > -1) {
    return true;
  }

  for(let i=0; i< webpackShimConfig.css_bundle_skip.length; i++) {
    if(path.join(__dirname, webpackShimConfig.css_bundle_skip[i]) === curr_path){
      return true;
    }
  }
  return false;
}

/* Get all the style files recursively and store in array to
 * give input to webpack.
 */
function pushModulesCss(curr_path, pgadminStyles) {
  /** Skip Directories */
  if(cssToBeSkiped(curr_path)) {
    return;
  }

  fs.readdirSync(curr_path).map(function(curr_file) {
    /** Skip Files */
    if(cssToBeSkiped(path.join(curr_path, curr_file))) {
      return;
    }

    let stats = fs.statSync(path.join(curr_path, curr_file));
    /* if directory, dig further */
    if(stats.isDirectory()) {
      pushModulesCss(path.join(curr_path, curr_file), pgadminStyles);
    }
    else if(stats.isFile() && (curr_file.endsWith('.scss') || curr_file.endsWith('.css'))) {
      pgadminStyles.push(path.join(curr_path, curr_file));
    }
  });
}

let pgadminStyles = [];
/* Include what is given in shim config */
for(let i=0; i<webpackShimConfig.css_bundle_include.length; i++) {
  pgadminStyles.push(path.join(__dirname, webpackShimConfig.css_bundle_include[i]));
}
pushModulesCss(path.join(__dirname,'./pgadmin'), pgadminStyles);

module.exports = {
  mode: envType,
  devtool: devToolVal,
  stats: { children: false },
  // The base directory, an absolute path, for resolving entry points and loaders
  // from configuration.
  context: __dirname,
  // Specify entry points of application
  entry: {
    'app.bundle': sourceDir + '/bundle/app.js',
    codemirror: sourceDir + '/bundle/codemirror.js',
    sqleditor: './pgadmin/tools/sqleditor/static/js/sqleditor.js',
    debugger_direct: './pgadmin/tools/debugger/static/js/direct.js',
    file_utils: './pgadmin/misc/file_manager/static/js/utility.js',
    pgadmin: pgadminStyles,
    style: './pgadmin/static/css/style.css',
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
  externals: webpackShimConfig.externals,
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
      test: /\.js$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs'}]],
        },
      },
    }, {
      test: /external_table.*\.js/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs'}]],
        },
      },
    }, {
      // Transforms the code in a way that it works in the webpack environment.
      // It uses imports-loader internally to load dependency. Its
      // configuration is specified in webpack.shim.js
      // Ref: https://www.npmjs.com/package/shim-loader
      test: /\.js/,
      exclude: [/external_table/],
      loader: 'shim-loader',
      query: webpackShimConfig,
      include: path.join(__dirname, '/pgadmin/browser'),
    }, {
      test: require.resolve('./pgadmin/tools/datagrid/static/js/datagrid'),
      use: {
        loader: 'imports-loader?' +
        'pgadmin.dashboard' +
        ',pgadmin.tools.user_management' +
        ',pgadmin.browser.object_statistics' +
        ',pgadmin.browser.dependencies' +
        ',pgadmin.browser.dependents' +
        ',pgadmin.browser.object_sql' +
        ',pgadmin.browser.bgprocess' +
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
        ',pgadmin.node.foreign_server' +
        ',pgadmin.node.user_mapping' +
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
        ',pgadmin.node.table' +
        ',pgadmin.node.partition',
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
        ',pgadmin.file_manager' +
        ',pgadmin.settings' +
        ',pgadmin.tools.backup' +
        ',pgadmin.tools.restore' +
        ',pgadmin.tools.grant_wizard' +
        ',pgadmin.tools.maintenance' +
        ',pgadmin.tools.import_export' +
        ',pgadmin.tools.debugger.controller' +
        ',pgadmin.tools.debugger.direct' +
        ',pgadmin.node.pga_job',
      },
    }, {
      test: require.resolve('snapsvg'),
      use: {
        loader: 'imports-loader?this=>window,fix=>module.exports=0',
      },
    }, {
      test: /\.(jpe?g|png|gif|svg)$/i,
      loaders: [{
        loader: 'url-loader',
        options: {
          emitFile: true,
          name: 'img/[name].[ext]',
          limit: 4096,
        },
      }, {
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
      }],
      exclude: /vendor/,
    }, {
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loaders: [{
        loader: 'file-loader',
        options: {
          name: 'fonts/[name].[ext]',
          emitFile: true,
        },
      }],
      include: [
        /node_modules/,
        path.join(sourceDir, '/css/'),
        path.join(sourceDir, '/scss/'),
        path.join(sourceDir, '/fonts/'),
      ],
      exclude: /vendor/,
    }, {
      test: /\.scss$/,
      use: [
        {loader: MiniCssExtractPlugin.loader},
        {loader: 'css-loader'},
        {loader: 'sass-loader'},
        {
          loader: 'sass-resources-loader',
          options: {
            resources: [
              './pgadmin/static/scss/resources/pgadmin.resources.scss',
            ],
          },
        },
      ],
    }, {
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
      ],
    }],
    // Prevent module from parsing through webpack, helps in reducing build time
    noParse: [/moment.js/],
  },
  resolve: {
    alias: webpackShimConfig.resolveAlias,
    modules: ['node_modules', '.'],
    extensions: ['.js'],
    unsafeCache: true,
  },
  // Watch mode Configuration: After initial build, webpack will watch for
  // changes in files and compiles only files which are changed,
  // if watch is set to True
  // Reference: https://webpack.js.org/configuration/watch/#components/sidebar/sidebar.jsx
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
    ignored: /node_modules/,
  },
  // Webpack 4: uglifyPlugin moved from plugins to optimization
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        parallel: true,
        cache: true,
        uglifyOptions: {
          compress: false,
        },
      }),
    ],
    splitChunks: {
      cacheGroups: {
        vendors: {
          name: 'vendors',
          filename: 'vendor.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 1,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.isExternal(module);
          },
        },
        secondary: {
          name: 'pgadmin_commons',
          filename: 'pgadmin_commons.js',
          chunks: 'all',
          priority: 2,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.isPgAdminLib(module);
          },
        },
      },
    },
  },
  // Define list of Plugins used in Production or development mode
  // Ref:https://webpack.js.org/concepts/plugins/#components/sidebar/sidebar.jsx
  plugins: PRODUCTION ? [
    extractStyle,
    providePlugin,
    optimizeAssetsPlugin,
    sourceMapDevToolPlugin,
  ]: [
    extractStyle,
    providePlugin,
    hardSourceWebpackPlugin,
    sourceMapDevToolPlugin,
  ],
};
