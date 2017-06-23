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
      'alertify': sourcesDir + '/vendor/alertifyjs/alertify',
      'jquery': sourcesDir + '/vendor/jquery/jquery-1.11.2',
      'jquery.ui': sourcesDir + '/vendor/jquery-ui/jquery-ui-1.11.3',
      'jquery.event.drag': sourcesDir + '/vendor/jquery-ui/jquery.event.drag-2.2',
      'sources': sourcesDir + '/js',
      'underscore.string': sourcesDir + '/vendor/underscore/underscore.string',
      'vendor': sourcesDir + '/vendor/',
      'translations': regressionDir + '/javascript/fake_translations',
      'pgadmin.browser.endpoints': regressionDir + '/javascript/fake_endpoints',
      'slickgrid': nodeModulesDir + '/slickgrid/',
      'slickgrid.plugins': nodeModulesDir + '/slickgrid/plugins/',
      'slickgrid.grid': nodeModulesDir + '/slickgrid/slick.grid',
      'browser': path.resolve(__dirname, 'pgadmin/browser/static/js'),
      'pgadmin': sourcesDir + '/js/pgadmin',
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
