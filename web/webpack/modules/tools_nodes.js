/* eslint-env node */

module.exports = {
  name: 'tools_nodes',
  isReference: false,
  createSourceMap: true,
  dependencies: ['tools', 'nodes', 'core', 'vendor', 'codemirror'],
  entry: [
    'webpack/bundles/tools_nodes.js'
  ],
  resolve: {
    modules: ['.', 'node_modules']
  }
};
