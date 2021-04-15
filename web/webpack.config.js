/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
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
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
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
const pgadminThemesJson = __dirname + '/pgadmin/misc/themes/pgadmin.themes.json';

// Expose libraries in app context so they need not to
// require('libname') when used in a module
const providePlugin = new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery',
  'window.jQuery': 'jquery',
  _: 'underscore',
  Backbone: 'backbone',
  Backgrid: 'backgrid',
  pgAdmin: 'pgadmin',
  'moment': 'moment',
  'window.moment':'moment',
  process: 'process/browser',
  Buffer: ['buffer', 'Buffer'],
});

// Helps in debugging each single file, it extracts the module files
// from bundle so that they are accessible by search in Chrome's sources panel.
// Reference: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#components/sidebar/sidebar.jsx
const sourceMapDevToolPlugin = new webpack.SourceMapDevToolPlugin({
  filename: '[name].js.map',
  exclude: /(vendor|codemirror|slickgrid|pgadmin\.js|pgadmin.theme|pgadmin.static|style\.js|popper)/,
  columns: false,
});

// can be enabled using bundle:analyze
const bundleAnalyzer = new BundleAnalyzerPlugin({
  analyzerMode: analyzerMode,
  reportFilename: 'analyze_report.html',
});

const copyFiles = new CopyPlugin({
  patterns: [
    pgadminThemesJson,
    {
      from: './pgadmin/static/scss/resources/**/*.png',
      to: 'img/[name].[ext]',
    },
  ],
});

const imageMinimizer = new ImageMinimizerPlugin({
  test: /\.(jpe?g|png|gif|svg)$/i,
  minimizerOptions: {
    // Lossless optimization with custom option
    // Feel free to experiment with options for better result for you
    plugins: [
      ['mozjpeg', { progressive: true }],
      ['optipng', { optimizationLevel: 7 }],
      ['pngquant', {quality: [0.75, .9], speed: 3}],
    ],
  },
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
function pushModulesStyles(curr_path, pgadminStyles, extn) {
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
      pushModulesStyles(path.join(curr_path, curr_file), pgadminStyles, extn);
    }
    else if(stats.isFile() && (curr_file.endsWith(extn))) {
      pgadminStyles.push(path.join(curr_path, curr_file));
    }
  });
}

let pgadminScssStyles = [];
let pgadminCssStyles = [];

/* Include what is given in shim config */
for(let i=0; i<webpackShimConfig.css_bundle_include.length; i++) {
  if(webpackShimConfig.css_bundle_include[i].endsWith('.scss')) {
    pgadminScssStyles.push(path.join(__dirname, webpackShimConfig.css_bundle_include[i]));
  } else if(webpackShimConfig.css_bundle_include[i].endsWith('.css')){
    pgadminCssStyles.push(path.join(__dirname, webpackShimConfig.css_bundle_include[i]));
  }
}

pushModulesStyles(path.join(__dirname,'./pgadmin'), pgadminScssStyles, '.scss');
pushModulesStyles(path.join(__dirname,'./pgadmin'), pgadminCssStyles, '.css');
pgadminCssStyles.push(path.join(__dirname,'./pgadmin/static/js/pgadmin.fonticon.js'));

/* Get all the themes */

let all_themes_dir = path.join(__dirname,'./pgadmin/static/scss/resources');
let pgadminThemes = {};
/* Read all the theme dirs */
/* Theme format
    "theme_name": {
        "disp_name": "theme_name",
        "cssfile": "pgadmin.theme.theme_name",
        "preview_img": "theme_name_preview.png"
    }
*/
fs.readdirSync(all_themes_dir).map(function(curr_dir) {
  let stats = fs.statSync(path.join(all_themes_dir, curr_dir));

  if(stats.isDirectory()) {
    /* Theme directory found */
    let cssfile = 'pgadmin.theme.'+curr_dir;

    let disp_name = curr_dir;

    pgadminThemes[curr_dir] = {
      /* For now lets keep it as beta release */
      disp_name: disp_name,
      cssfile: cssfile,
      preview_img: curr_dir + '_preview.png',
    };
  }
});

fs.writeFileSync(pgadminThemesJson, JSON.stringify(pgadminThemes, null, 4));

var themeCssRules = function(theme_name) {
  return [{
    test: /\.(jpe?g|png|gif|svg)$/i,
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
  }, {
    test: /\.(eot|svg|ttf|woff|woff2)$/,
    type: 'asset/resource',
    generator: {
      filename: 'fonts/[name].[ext]',
    },
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
      {
        loader: MiniCssExtractPlugin.loader,
        options: {
          publicPath: '',
        },
      },
      {loader: 'css-loader'},
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
      {loader: 'sass-loader'},
      {
        loader: 'sass-resources-loader',
        options: {
          resources: function(_theme_name){
            let ret_res = [
              './pgadmin/static/scss/resources/pgadmin.resources.scss',
            ];
            if(_theme_name!='standard') {
              ret_res.unshift('./pgadmin/static/scss/resources/' + _theme_name + '/_theme.variables.scss');
            }
            return ret_res;
          }(theme_name),
        },
      },
    ],
  }, {
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
  }];
};

var getThemeWebpackConfig = function(theme_name) {
  return {
    mode: envType,
    devtool: devToolVal,
    stats: { children: false },
    // The base directory, an absolute path, for resolving entry points and loaders
    // from configuration.
    context: __dirname,
    // Specify entry points of application
    entry: {
      [pgadminThemes[theme_name].cssfile]: pgadminScssStyles,
    },
    // path: The output directory for generated bundles(defined in entry)
    // Ref: https://webpack.js.org/configuration/output/#output-library
    output: {
      libraryTarget: 'amd',
      path: outputPath,
      filename: '[name].js',
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
      rules: themeCssRules(theme_name),
    },
    optimization: {
      minimize: true,
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
              },
            ],
          }
        }),
      ],
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
    // Define list of Plugins used in Production or development mode
    // Ref:https://webpack.js.org/concepts/plugins/#components/sidebar/sidebar.jsx
    plugins: [
      extractStyle,
      sourceMapDevToolPlugin,
    ]
  };
};

var pgadminThemesWebpack = [];
Object.keys(pgadminThemes).map((theme_name)=>{
  pgadminThemesWebpack.push(getThemeWebpackConfig(theme_name));
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
    codemirror: sourceDir + '/bundle/codemirror.js',
    slickgrid: sourceDir + '/bundle/slickgrid.js',
    sqleditor: './pgadmin/tools/sqleditor/static/js/sqleditor.js',
    debugger_direct: './pgadmin/tools/debugger/static/js/direct.js',
    schema_diff: './pgadmin/tools/schema_diff/static/js/schema_diff_hook.js',
    erd_tool: './pgadmin/tools/erd/static/js/erd_tool_hook.js',
    file_utils: './pgadmin/misc/file_manager/static/js/utility.js',
    'pgadmin.style': pgadminCssStyles,
    pgadmin: pgadminScssStyles,
    style: './pgadmin/static/css/style.css',
  },
  // path: The output directory for generated bundles(defined in entry)
  // Ref: https://webpack.js.org/configuration/output/#output-library
  output: {
    libraryTarget: 'amd',
    path: outputPath,
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
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
    // at the beginning of module it is dependency of like:
    // var jQuery = require('jquery'); var browser = require('pgadmin.browser')
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
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}], '@babel/preset-react'],
          plugins: ['@babel/plugin-proposal-class-properties'],
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
      // at the beginning of module it is dependency of like:
      // var jQuery = require('jquery'); var browser = require('pgadmin.browser')
      // It solves number of problems
      // Ref: http:/github.com/webpack-contrib/imports-loader/
      test: require.resolve('./pgadmin/tools/datagrid/static/js/datagrid'),
      use: {
        loader: 'imports-loader',
        options: {
          type: 'commonjs',
          imports: [
            'pure|pgadmin.dashboard',
            'pure|pgadmin.browser.quick_search',
            'pure|pgadmin.tools.user_management',
            'pure|pgadmin.browser.object_statistics',
            'pure|pgadmin.browser.dependencies',
            'pure|pgadmin.browser.dependents',
            'pure|pgadmin.browser.object_sql',
            'pure|pgadmin.browser.bgprocess',
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
          ],
        },
      },
    }, {
      test: require.resolve('./node_modules/acitree/js/jquery.aciTree.min'),
      use: {
        loader: 'imports-loader',
        options: {
          wrapper: 'window',
        },
      },
    }, {
      test: require.resolve('./node_modules/acitree/js/jquery.aciPlugin.min'),
      use: {
        loader: 'imports-loader',
        options: {
          wrapper: 'window',
        },
      },
    }, {
      test: require.resolve('./pgadmin/static/bundle/browser'),
      use: {
        loader: 'imports-loader',
        options: {
          type: 'commonjs',
          imports: [
            'pure|pgadmin.about',
            'pure|pgadmin.preferences',
            'pure|pgadmin.file_manager',
            'pure|pgadmin.settings',
            'pure|pgadmin.tools.backup',
            'pure|pgadmin.tools.restore',
            'pure|pgadmin.tools.grant_wizard',
            'pure|pgadmin.tools.maintenance',
            'pure|pgadmin.tools.import_export',
            'pure|pgadmin.tools.debugger.controller',
            'pure|pgadmin.tools.debugger.direct',
            'pure|pgadmin.node.pga_job',
            'pure|pgadmin.tools.schema_diff',
            'pure|pgadmin.tools.storage_manager',
            'pure|pgadmin.tools.search_objects',
            'pure|pgadmin.tools.erd_module',
          ],
        },
      },
    }].concat(themeCssRules('standard')),
    // Prevent module from parsing through webpack, helps in reducing build time
    noParse: [/moment.js/],
  },
  resolve: {
    alias: webpackShimConfig.resolveAlias,
    modules: ['node_modules', '.'],
    extensions: ['.js', '.jsx'],
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
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: true,
        terserOptions: {
          compress: true,
        },
      }),
    ],
    splitChunks: {
      cacheGroups: {
        vendor_main: {
          name: 'vendor_main',
          filename: 'vendor.main.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 7,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, ['wcdocker', 'backbone', 'jquery', 'bootstrap', 'popper']);
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
    imageMinimizer,
  ]: [
    extractStyle,
    providePlugin,
    sourceMapDevToolPlugin,
    copyFiles,
  ],
}].concat(pgadminThemesWebpack);
