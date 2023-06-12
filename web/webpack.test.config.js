/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-env node */
const path = require('path');
const webpack = require('webpack');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

const sourcesDir = path.resolve(__dirname, 'pgadmin/static');
const regressionDir = path.resolve(__dirname, 'regression');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      _: 'lodash',
      'window.jQuery': 'jquery',
      'moment': 'moment',
      'window.moment':'moment',
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new ImageMinimizerPlugin({
      test: /\.(jpe?g|png|gif)$/i,
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [
            ['mozjpeg', { progressive: true }],
            ['optipng', { optimizationLevel: 7 }],
            ['pngquant', {quality: [0.75, .9], speed: 3}],
          ],
        },
      },
    }),
  ],

  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}], '@babel/preset-react'],
          plugins: ['@babel/plugin-proposal-class-properties'],
          sourceMap: 'inline',
        },
      },
    }, {
      test: /\.tsx?$|\.ts?$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', {'modules': 'commonjs', 'useBuiltIns': 'usage', 'corejs': 3}], '@babel/preset-react', '@babel/preset-typescript'],
          plugins: ['@babel/plugin-proposal-class-properties', '@babel/proposal-object-rest-spread'],
          sourceMap: 'inline',
        },
      },
    }, {
      test: /\.css$/,
      type: 'asset/source',
      use: ['style-loader'],
    }, {
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
    }, {
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
    },
    {
      test: /\.js$|\.jsx$/,
      use: {
        loader: 'istanbul-instrumenter-loader',
        options: { esModules: true },
      },
      enforce: 'post',
      exclude: /node_modules|plugins|bundle|generated|regression|[Tt]est.js|[Ss]pecs.js|[Ss]pec.js|\.spec\.js/,
    },{
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      },
    },
    ],
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      'top': path.join(__dirname, './pgadmin'),
      'jquery': path.join(__dirname, './node_modules/jquery/dist/jquery'),
      'wcdocker': path.join(__dirname, './node_modules/webcabin-docker/Build/wcDocker'),
      'color-picker': path.join(__dirname, './node_modules/@simonwep/pickr/dist/pickr.min'),
      'bignumber': path.join(__dirname, './node_modules/bignumber.js/bignumber'),
      'react': path.join(__dirname, 'node_modules/react'),
      'react-dom': path.join(__dirname, 'node_modules/react-dom'),
      'socketio': path.join(__dirname, './node_modules/socket.io-client/dist/socket.io.js'),
      'sources': sourcesDir + '/js',
      'translations': regressionDir + '/javascript/fake_translations',
      'pgadmin.browser.messages': regressionDir + '/javascript/fake_messages',
      'pgadmin.server.supported_servers': regressionDir + '/javascript/fake_supported_servers',
      'pgadmin.browser.endpoints': regressionDir + '/javascript/fake_endpoints',
      'moment': path.join(__dirname, './node_modules/moment/moment'),
      'jsoneditor.min': path.join(__dirname, './node_modules/jsoneditor/dist/jsoneditor.min'),
      'browser': path.resolve(__dirname, 'pgadmin/browser/static/js'),
      'pgadmin': sourcesDir + '/js/pgadmin',
      'pgadmin.sqlfoldcode': sourcesDir + '/js/codemirror/addon/fold/pgadmin-sqlfoldcode',
      'pgbrowser': path.resolve(__dirname, 'regression/javascript/fake_browser'),
      'pgadmin.schema.dir': path.resolve(__dirname, 'pgadmin/browser/server_groups/servers/databases/schemas/static/js'),
      'pgadmin.browser.layout': path.join(__dirname, './pgadmin/browser/static/js/layout'),
      'pgadmin.browser.preferences': path.join(__dirname, './pgadmin/browser/static/js/preferences'),
      'pgadmin.browser.activity': path.join(__dirname, './pgadmin/browser/static/js/activity'),
      'pgadmin.tools.erd': path.join(__dirname, './pgadmin/tools/erd/static/js'),
      'pgadmin.tools.psql': path.join(__dirname, './pgadmin/tools/psql/static/js'),
      'pgadmin.tools.sqleditor': path.join(__dirname, './pgadmin/tools/sqleditor/static/js'),
      'pgadmin.tools.file_manager': path.join(__dirname, './pgadmin/misc/file_manager/static/js'),
      'pgadmin.authenticate.kerberos': path.join(__dirname, './pgadmin/authenticate/static/js/kerberos'),
      'bundled_codemirror': path.join(__dirname, './pgadmin/static/bundle/codemirror'),
      'tools': path.join(__dirname, './pgadmin/tools/'),
      'pgadmin.user_management.current_user': regressionDir + '/javascript/fake_current_user',
      'pgadmin.browser.constants': regressionDir + '/javascript/fake_constants',
      'pgadmin.help': path.join(__dirname, './pgadmin/help/static/js/help'),
    },
    fallback: {
      'fs': false
    },
  },
};
