/* eslint-env node */

module.exports = {
  context: __dirname + '/pgadmin/static',
  entry: {
    reactComponents: './bundle/components.js',
    history: './js/history/index.js',
    slickgrid: './bundle/slickgrid.js',
  },
  output: {
    libraryTarget: 'amd',
    path: __dirname + '/pgadmin/static/js/generated',
    filename: '[name].js',
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
      test: /\.css$/,
      use: ['style-loader', 'raw-loader'],
    }],
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },
};