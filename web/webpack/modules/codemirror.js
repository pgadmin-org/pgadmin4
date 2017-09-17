/* eslint-env node */
const path = require('path');

var codemirror = {
  name: 'codemirror',
  isReference: false,
  createSourceMap: true,
  entry: ['webpack/bundles/codemirror'],
  shimConfig: {
    alias: {
      'codemirror': 'node_modules/codemirror',
      'sources': 'pgadmin/static/js',
      'webpack_bundle': 'webpack/bundles'
    }
  }
};

module.exports = codemirror;
