/* eslint-env node */

var app = {
  name: 'app',
  createSourceMap: true,
  dependencies: ['core', 'codemirror', 'vendor'],
  entry: ['webpack/bundles/app']
};

module.exports = app;
