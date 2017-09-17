/* eslint-env node */
const webpack = require('webpack');

var react = {
  name: 'react',
  isReference: true,
  createSourceMap: true,
  entry: ['react', 'react-dom', 'react-split-pane'],
  plugins: [
    // Define plugin
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
  ],
  shimConfig: {
    alias: {
      'react': 'pgadmin/static/vendor/react',
      'react-dom': 'pgadmin/static/vendor/react-dom',
    }
  }
};

module.exports = react;
