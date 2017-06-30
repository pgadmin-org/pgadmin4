/* eslint-env node */

const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: '[name].css',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = {
  context: __dirname + '/pgadmin/static',
  entry: {
    reactComponents: './bundle/components.js',
    history: './js/history/index.js',
    slickgrid: './bundle/slickgrid.js',
    pgadmincss: './scss/pgadmin.scss',
  },
  output: {
    libraryTarget: 'amd',
    path: __dirname + '/pgadmin/static/js/generated',
    filename: '[name].js',
  },

  plugins: [extractSass],
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
      test: /\.css$/,
      use: ['style-loader', 'raw-loader'],
    }, {
      test: /\.scss$/,
      use: extractSass.extract({
        use: [{
          loader: 'css-loader',
        }, {
          loader: 'sass-loader', // compiles Sass to CSS
        }],
      }),
    }],
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },
};