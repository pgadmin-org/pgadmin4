/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-env node */
// Import file, libraries and plugins
const path = require('path');
const webpack = require('webpack');
const sourceDir = __dirname + '/pgadmin/static';
// webpack.shim.js contains path references for resolve > alias configuration
// and other util function used in CommonsChunksPlugin.
const webpackShimConfig = require('./webpack.shim');
const PRODUCTION = process.env.NODE_ENV === 'production';
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const extractStyle = new MiniCssExtractPlugin({
  filename: '[name].css',
  chunkFilename: '[name].css',
});
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyPlugin = require('copy-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

const envType = PRODUCTION ? 'production': 'development';
const devToolVal = PRODUCTION ? false : 'eval';
const analyzerMode = process.env.ANALYZE=='true' ? 'static' : 'disabled';

const outputPath = __dirname + '/pgadmin/static/js/generated';

// Expose libraries in app context so they need not to
// require('libname') when used in a module
const providePlugin = new webpack.ProvidePlugin({
  _: 'lodash',
  pgAdmin: 'sources/pgadmin',
  'moment': 'moment',
  'window.moment':'moment',
  process: 'process/browser',
  Buffer: ['buffer', 'Buffer']
});

// Helps in debugging each single file, it extracts the module files
// from bundle so that they are accessible by search in Chrome's sources panel.
// Reference: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#components/sidebar/sidebar.jsx
const sourceMapDevToolPlugin = new webpack.SourceMapDevToolPlugin({
  filename: '[name].js.map',
  exclude: /(vendor|codemirror|pgadmin\.js|pgadmin.theme|pgadmin.static|style\.js|popper)/,
  columns: false,
});

// can be enabled using bundle:analyze
const bundleAnalyzer = new BundleAnalyzerPlugin({
  analyzerMode: analyzerMode,
  reportFilename: 'analyze_report.html',
});

const copyFiles = new CopyPlugin({
  patterns: [
    {
      from: './pgadmin/static/img/*.png',
      to: 'img/[name][ext]',
    },
  ],
});

module.exports = [{
  mode: envType,
  devtool: devToolVal,
  stats: { children: false, builtAt: true, chunks: true, timings: true },
  // The base directory, an absolute path, for resolving entry points and loaders
  // from configuration.
  context: __dirname,
  // Specify entry points of application
  entry: {
    'app.bundle': sourceDir + '/bundle/app.js',
    'security.pages': 'security.pages',
    sqleditor: './pgadmin/tools/sqleditor/static/js/index.js',
    schema_diff: './pgadmin/tools/schema_diff/static/js/index.js',
    erd_tool: './pgadmin/tools/erd/static/js/index.js',
    psql_tool: './pgadmin/tools/psql/static/js/index.js',
    debugger: './pgadmin/tools/debugger/static/js/index.js',
    style: ['./pgadmin/static/css/style.css', './pgadmin/static/js/pgadmin.fonticon.js']
  },
  // path: The output directory for generated bundles(defined in entry)
  // Ref: https://webpack.js.org/configuration/output/#output-library
  output: {
    libraryTarget: 'amd',
    path: outputPath,
    filename: '[name].js',
    chunkFilename: '[name].chunk.js?id=[chunkhash]',
    libraryExport: 'default',
    publicPath: '',
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
    // at the beginning of module it is dependency.
    // It solves number of problems
    // Ref: http:/github.com/webpack-contrib/imports-loader/
    rules: [{
      test: /\.fonticon\.js/,
      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            url: false,
          },
        },
        'webfonts-loader',
      ],
    },{
      test: /\.jsx?$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
      },
    },{
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      },
    },{
      test: /\.tsx?$|\.ts?$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}], '@babel/preset-react', '@babel/preset-typescript'],
          plugins: ['@babel/plugin-proposal-class-properties', '@babel/proposal-object-rest-spread'],
        },
      },
    }, {
      test: /external_table.*\.js/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}]],
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
      options: webpackShimConfig,
      include: path.join(__dirname, '/pgadmin/browser'),
    }, {
      // imports-loader: it adds dependent modules(use:imports-loader?module1)
      // at the beginning of module it is dependency.
      // It solves number of problems
      // Ref: http:/github.com/webpack-contrib/imports-loader/
      test: require.resolve('./pgadmin/tools/sqleditor/static/js/index'),
      use: {
        loader: 'imports-loader',
        options: {
          type: 'commonjs',
          imports: [
            'pure|pgadmin.tools.user_management',
            'pure|pgadmin.browser.bgprocessmanager',
            'pure|pgadmin.node.server_group',
            'pure|pgadmin.node.server',
            'pure|pgadmin.node.database',
            'pure|pgadmin.node.role',
            'pure|pgadmin.node.cast',
            'pure|pgadmin.node.publication',
            'pure|pgadmin.node.subscription',
            'pure|pgadmin.node.tablespace',
            'pure|pgadmin.node.resource_group',
            'pure|pgadmin.node.event_trigger',
            'pure|pgadmin.node.extension',
            'pure|pgadmin.node.language',
            'pure|pgadmin.node.foreign_data_wrapper',
            'pure|pgadmin.node.foreign_server',
            'pure|pgadmin.node.user_mapping',
            'pure|pgadmin.node.schema',
            'pure|pgadmin.node.catalog',
            'pure|pgadmin.node.foreign_table_column',
            'pure|pgadmin.node.catalog_object',
            'pure|pgadmin.node.collation',
            'pure|pgadmin.node.domain',
            'pure|pgadmin.node.domain_constraints',
            'pure|pgadmin.node.foreign_table',
            'pure|pgadmin.node.fts_configuration',
            'pure|pgadmin.node.fts_dictionary',
            'pure|pgadmin.node.fts_parser',
            'pure|pgadmin.node.fts_template',
            'pure|pgadmin.node.function',
            'pure|pgadmin.node.procedure',
            'pure|pgadmin.node.edbfunc',
            'pure|pgadmin.node.edbproc',
            'pure|pgadmin.node.edbvar',
            'pure|pgadmin.node.trigger_function',
            'pure|pgadmin.node.package',
            'pure|pgadmin.node.sequence',
            'pure|pgadmin.node.synonym',
            'pure|pgadmin.node.type',
            'pure|pgadmin.node.rule',
            'pure|pgadmin.node.index',
            'pure|pgadmin.node.row_security_policy',
            'pure|pgadmin.node.trigger',
            'pure|pgadmin.node.catalog_object_column',
            'pure|pgadmin.node.view',
            'pure|pgadmin.node.mview',
            'pure|pgadmin.node.table',
            'pure|pgadmin.node.partition',
            'pure|pgadmin.node.compound_trigger',
            'pure|pgadmin.node.aggregate',
            'pure|pgadmin.node.operator',
            'pure|pgadmin.node.dbms_job_scheduler',
            'pure|pgadmin.node.replica_node',
            'pure|pgadmin.node.pgd_replication_groups',
            'pure|pgadmin.node.pgd_replication_servers',
          ],
        },
      },
    },{
      test: require.resolve('./pgadmin/static/bundle/browser'),
      use: {
        loader: 'imports-loader',
        options: {
          type: 'commonjs',
          imports: [
            'pure|pgadmin.about',
            'pure|pgadmin.preferences',
            'pure|pgadmin.settings',
            'pure|pgadmin.tools.backup',
            'pure|pgadmin.tools.restore',
            'pure|pgadmin.tools.grant_wizard',
            'pure|pgadmin.tools.maintenance',
            'pure|pgadmin.tools.import_export',
            'pure|pgadmin.tools.import_export_servers',
            'pure|pgadmin.tools.debugger',
            'pure|pgadmin.node.pga_job',
            'pure|pgadmin.tools.schema_diff',
            'pure|pgadmin.tools.file_manager',
            'pure|pgadmin.tools.search_objects',
            'pure|pgadmin.tools.erd',
            'pure|pgadmin.tools.psql',
            'pure|pgadmin.tools.sqleditor',
            'pure|pgadmin.misc.cloud',
          ],
        },
      },
    },
    {
      test: /\.svg$/,
      oneOf: [
        {
          issuer: /\.[jt]sx?$/,
          resourceQuery: /svgr/,
          use: ['@svgr/webpack'],
        },
        {
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 4 * 1024, // 4kb
            }
          }
        },
      ],
    },{
      test: /\.(jpe?g|png|gif)$/i,
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: 4 * 1024, // 4kb
        },
      },
      generator: {
        filename: 'img/[name].[ext]',
      },
      exclude: /vendor/,
    },{
      test: /\.(eot|ttf|woff|woff2)$/,
      type: 'asset/resource',
      generator: {
        filename: 'fonts/[name].[ext]',
      },
      include: [
        /node_modules/,
        path.join(sourceDir, '/css/'),
        path.join(sourceDir, '/fonts/'),
      ],
      exclude: /vendor/,
    },
    {
      test: /\.css$/,
      use: [
        {
          loader: MiniCssExtractPlugin.loader,
          options: {
            publicPath: '',
          },
        },
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: () =>({
              plugins: [
                require('autoprefixer')(),
              ],
            }),
          },
        },
      ],
    }],
    // Prevent module from parsing through webpack, helps in reducing build time
    noParse: [/moment.js/],
  },
  resolve: {
    alias: webpackShimConfig.resolveAlias,
    modules: ['node_modules', '.'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    unsafeCache: true,
    fallback: {
      'fs': false
    },
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
  optimization: {
    minimizer: PRODUCTION ? [
      new TerserPlugin({
        parallel: false,
        extractComments: true,
        terserOptions: {
          compress: true,
        },
      }),
      new ImageMinimizerPlugin({
        test: /\.(jpe?g|png|gif)$/i,
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminMinify,
          options: {
            plugins: [
              ['mozjpeg', { progressive: true }],
              ['optipng', { optimizationLevel: 7 }],
            ],
          },
        },
      }),
    ] : [],
    splitChunks: {
      cacheGroups: {
        vendor_sqleditor: {
          name: 'vendor_sqleditor',
          filename: 'vendor.sqleditor.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 9,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, ['jsoneditor', 'leaflet']);
          },
        },
        vendor_react: {
          name: 'vendor_react',
          filename: 'vendor.react.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 8,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, ['react', 'react-dom']);
          },
        },
        vendor_main: {
          name: 'vendor_main',
          filename: 'vendor.main.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 7,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, ['codemirror', 'rc-', '@mui']);
          },
        },
        vendor_others: {
          name: 'vendor_others',
          filename: 'vendor.others.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 6,
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
          priority: 5,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.isPgAdminLib(module);
          },
        },
        browser_nodes: {
          name: 'browser_nodes',
          filename: 'browser_nodes.js',
          chunks: 'all',
          priority: 4,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.isBrowserNode(module);
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
    sourceMapDevToolPlugin,
    bundleAnalyzer,
    copyFiles,
  ]: [
    extractStyle,
    providePlugin,
    sourceMapDevToolPlugin,
    copyFiles,
  ],
}];
