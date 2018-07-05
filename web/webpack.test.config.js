/* eslint-env node */
const path = require('path');
const webpack = require('webpack');

const sourcesDir = path.resolve(__dirname, 'pgadmin/static');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const regressionDir = path.resolve(__dirname, 'regression');

module.exports = {
  devtool: 'inline-source-map',
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      _: 'underscore',
      'underscore.string': 'underscore.string',
      'window.jQuery': 'jquery',
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
            presets: ['es2015', 'react', 'airbnb'],
          },
        },
      }, {
        test: /\.css$/,
        use: [ 'style-loader', 'raw-loader' ],
      }, {
        test: /.*slickgrid[\\\/]+slick\.(?!core)*/,
        loader: 'imports-loader?' +
        'jquery.ui' +
        ',jquery.event.drag' +
        ',slickgrid',
      }, {
        test: /.*slickgrid\.plugins[\\\/]+slick\.cellrangeselector/,
        loader: 'imports-loader?' +
        'jquery.ui' +
        ',jquery.event.drag' +
        ',slickgrid' +
        '!exports-loader?' +
        'Slick.CellRangeSelector',
      }, {
        test: /.*slickgrid[\\\/]+slick\.core.*/,
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
      'jquery.event.drag': path.join(__dirname, './node_modules/slickgrid/lib/jquery.event.drag-2.3.0'),
      'jquery.ui': path.join(__dirname, './node_modules/slickgrid/lib/jquery-ui-1.11.3'),
      'spectrum': path.join(__dirname, './node_modules/spectrum-colorpicker/spectrum'),
      'bignumber': path.join(__dirname, './node_modules/bignumber.js/bignumber'),
      'bootstrap.datetimepicker': path.join(__dirname, './node_modules/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min'),
      'bootstrap.switch': path.join(__dirname, './node_modules/bootstrap-switch/dist/js/bootstrap-switch'),
      'backbone': path.join(__dirname, './node_modules/backbone/backbone'),
      'backform': path.join(__dirname, './node_modules/backform/src/backform'),
      'backgrid': path.join(__dirname, './node_modules/backgrid/lib/backgrid'),
      'sources': sourcesDir + '/js',
      'translations': regressionDir + '/javascript/fake_translations',
      'pgadmin.browser.endpoints': regressionDir + '/javascript/fake_endpoints',
      'slickgrid': nodeModulesDir + '/slickgrid/',
      'slickgrid.plugins': nodeModulesDir + '/slickgrid/plugins/',
      'slickgrid.grid': nodeModulesDir + '/slickgrid/slick.grid',
      'browser': path.resolve(__dirname, 'pgadmin/browser/static/js'),
      'pgadmin': sourcesDir + '/js/pgadmin',
      'pgadmin.sqlfoldcode': sourcesDir + '/js/codemirror/addon/fold/pgadmin-sqlfoldcode',
      'pgadmin.alertifyjs': sourcesDir + '/js/alertify.pgadmin.defaults',
      'pgadmin.backgrid': sourcesDir + '/js/backgrid.pgadmin',
      'pgadmin.backform': sourcesDir + '/js/backform.pgadmin',
      'pgbrowser': path.resolve(__dirname, 'regression/javascript/fake_browser'),
      'pgadmin.schema.dir': path.resolve(__dirname, 'pgadmin/browser/server_groups/servers/databases/schemas/static/js'),
      'pgadmin.browser.preferences': path.join(__dirname, './pgadmin/browser/static/js/preferences'),
    },
  },
};
