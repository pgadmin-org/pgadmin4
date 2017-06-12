/* eslint-env node */

module.exports = {
  context: __dirname + '/pgadmin/static/jsx',
  entry: './components.jsx',
  output: {
    libraryTarget: 'amd',
    path: __dirname + '/pgadmin/static/js/generated',
    filename: 'reactComponents.js',
  },

  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
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