/* eslint-env node */

module.exports = {
  context: __dirname + '/pgadmin/static',
  entry: {
    reactComponents: './jsx/components.jsx',
    history: './js/history/index.js',
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
    },
    ],
  },

  resolve: {
    extensions: ['.js', '.jsx'],
  },
};