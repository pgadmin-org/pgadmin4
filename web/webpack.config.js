/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
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
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const extractStyle = new MiniCssExtractPlugin({
  filename: '[name].css',
  chunkFilename: '[name].css',
  allChunks: true,
});
const WebpackRequireFromPlugin = require('webpack-require-from');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyPlugin = require('copy-webpack-plugin');
const IconfontWebpackPlugin = require('iconfont-webpack-plugin');

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
});

// Optimize CSS Assets by removing comments while bundling
const optimizeAssetsPlugin = new OptimizeCssAssetsPlugin({
  assetNameRegExp: /\.css$/g,
  cssProcessor: require('cssnano'),
  cssProcessorOptions: {
    discardComments: {
      removeAll: true,
    },
  },
  canPrint: true,
});

// Helps in debugging each single file, it extracts the module files
// from bundle so that they are accessible by search in Chrome's sources panel.
// Reference: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#components/sidebar/sidebar.jsx
const sourceMapDevToolPlugin = new webpack.SourceMapDevToolPlugin({
  filename: '[name].js.map',
  exclude: /(vendor|codemirror|slickgrid|pgadmin\.js|pgadmin.theme|pgadmin.static|style\.js|popper)/,
  columns: false,
});

// Supress errors while compiling as the getChunkURL method will be available
// on runtime. window.getChunkURL is defined in base.html
const webpackRequireFrom = new WebpackRequireFromPlugin({
  methodName: 'getChunkURL',
  supressErrors: true,
});

// can be enabled using bundle:analyze
const bundleAnalyzer = new BundleAnalyzerPlugin({
  analyzerMode: analyzerMode,
  reportFilename: 'analyze_report.html',
});

const copyFiles = new CopyPlugin([
  pgadminThemesJson,
  {
    from: './pgadmin/static/scss/resources/**/*.png',
    to: outputPath + '/img',
    flatten: true,
  },
]);

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

    if(curr_dir == 'high_contrast') {
      disp_name = curr_dir + ' (Beta)';
    }

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
      {
        loader: 'postcss-loader',
        options: {
          plugins: (loader) => [
            require('autoprefixer')(),
            new IconfontWebpackPlugin(loader),
          ],
        },
      },
      {loader: 'sass-loader'},
      {
        loader: 'sass-resources-loader',
        options: {
          resources: function(_theme_name){
            let ret_res = [
              './pgadmin/static/scss/resources/' + _theme_name + '/_theme.variables.scss',
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
      MiniCssExtractPlugin.loader,
      'css-loader',
      {
        loader: 'postcss-loader',
        options: {
          plugins: (loader) => [
            require('autoprefixer')(),
            new IconfontWebpackPlugin(loader),
          ],
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
      rules: themeCssRules(theme_name),
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
    plugins: PRODUCTION ? [
      extractStyle,
      optimizeAssetsPlugin,
      sourceMapDevToolPlugin,
    ]: [
      extractStyle,
      sourceMapDevToolPlugin,
    ],
  };
};

var pgadminThemesWebpack = [];
Object.keys(pgadminThemes).map((theme_name)=>{
  pgadminThemesWebpack.push(getThemeWebpackConfig(theme_name));
});

module.exports = [{
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
    slickgrid: sourceDir + '/bundle/slickgrid.js',
    sqleditor: './pgadmin/tools/sqleditor/static/js/sqleditor.js',
    debugger_direct: './pgadmin/tools/debugger/static/js/direct.js',
    schema_diff: './pgadmin/tools/schema_diff/static/js/schema_diff_hook.js',
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
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}]],
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
        ',pgadmin.node.row_security_policy' +
        ',pgadmin.node.trigger' +
        ',pgadmin.node.catalog_object_column' +
        ',pgadmin.node.view' +
        ',pgadmin.node.mview' +
        ',pgadmin.node.table' +
        ',pgadmin.node.partition' +
        ',pgadmin.node.compound_trigger',
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
        ',pgadmin.node.pga_job' +
        ',pgadmin.tools.schema_diff' +
        ',pgadmin.tools.search_objects',
      },
    }, {
      test: require.resolve('snapsvg'),
      use: {
        loader: 'imports-loader?this=>window,fix=>module.exports=0',
      },
    }].concat(themeCssRules('standard')),
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
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        cache: true,
        terserOptions: {
          compress: true,
          extractComments: true,
          output: {
            comments: false,
          },
        },
      }),
    ],
    splitChunks: {
      cacheGroups: {
        slickgrid: {
          name: 'slickgrid',
          filename: 'slickgrid.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 9,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, 'slickgrid');
          },
        },
        codemirror: {
          name: 'codemirror',
          filename: 'codemirror.js',
          chunks: 'all',
          reuseExistingChunk: true,
          priority: 8,
          minChunks: 2,
          enforce: true,
          test(module) {
            return webpackShimConfig.matchModules(module, 'codemirror');
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
    optimizeAssetsPlugin,
    sourceMapDevToolPlugin,
    webpackRequireFrom,
    bundleAnalyzer,
    copyFiles,
  ]: [
    extractStyle,
    providePlugin,
    sourceMapDevToolPlugin,
    webpackRequireFrom,
    copyFiles,
  ],
}].concat(pgadminThemesWebpack);
