/* eslint-env node */
const path = require('path');
const webpack = require('webpack');

const sourcesDir = path.resolve(__dirname, 'pgadmin/static');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const regressionDir = path.resolve(__dirname, 'regression');

module.exports = {
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      _: 'underscore',
      'underscore.string': 'underscore.string',
    }),
  ],

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: [/node_modules/, /vendor/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015', 'react'],
          },
        },
      }, {
        test: /\.css$/,
        use: [ 'style-loader', 'raw-loader' ],
      }, {
        test: /.*slickgrid\/slick\.(?!core)*/,
        loader: 'imports-loader?' +
        'jquery.ui' +
        ',jquery.event.drag' +
        ',slickgrid',
      }, {
        test: /.*slickgrid\.plugins\/slick\.cellrangeselector/,
        loader: 'imports-loader?' +
        'jquery.ui' +
        ',jquery.event.drag' +
        ',slickgrid' +
        '!exports-loader?' +
        'Slick.CellRangeSelector',
      }, {
        test: /.*slickgrid\/slick\.core.*/,
        loader: 'imports-loader?' +
        'jquery.ui' +
        ',jquery.event.drag' +
        '!exports-loader?' +
        'Slick',
      }],
  },

  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      'jquery': path.join(__dirname, './node_modules/jquery/dist/jquery'),
      'alertify': path.join(__dirname, './node_modules/alertifyjs/build/alertify'),
      'jquery.event.drag': path.join(__dirname, './node_modules/slickgrid/lib/jquery.event.drag-2.2'),
      'jquery.ui': path.join(__dirname, './node_modules/slickgrid/lib/jquery-ui-1.11.3'),
      'sources': sourcesDir + '/js',
      'translations': regressionDir + '/javascript/fake_translations',
      'pgadmin.browser.endpoints': regressionDir + '/javascript/fake_endpoints',
      'slickgrid.plugins': nodeModulesDir + '/slickgrid/plugins/',
      'slickgrid.grid': nodeModulesDir + '/slickgrid/slick.grid',
      'browser': path.resolve(__dirname, 'pgadmin/browser/static/js'),
      'pgadmin': sourcesDir + '/js/pgadmin',
      'pgadmin.sqlfoldcode': sourcesDir + '/js/codemirror/addon/fold/pgadmin-sqlfoldcode',
      'pgadmin.alertifyjs': sourcesDir + '/js/alertify.pgadmin.defaults',
      'pga_sqleditor': path.join(__dirname, 'pgadmin/tools/sqleditor/static'),
      'vendor': 'sources/generated/vendor',
      'slickgrid': 'sources/generated/slickgrid',
      'core': 'sources/generated/core',
      'nodes': 'sources/generated/nodes',
      'tools': 'sources/generated/tools',
      'app': 'sources/generated/app',
      'webpack_bundle': path.join(__dirname, 'webpack/bundles'),
      'react': path.join(__dirname, 'pgadmin/static/vendor/react'),
      'react-dom': path.join(__dirname, 'pgadmin/static/vendor/react-dom'),
    },
  },
  externals: {
    'react/addons': true,
    'react/lib/ReactContext': true,
    'react/lib/ExecutionEnvironment': true,
    'react-dom/test-utils': true,
    'react-test-renderer/shallow': true,
  },
};
