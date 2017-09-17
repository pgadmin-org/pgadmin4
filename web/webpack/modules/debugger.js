/* eslint-env node */
const path = require('path');

var direct_debug = {
  name: 'direct_debug',
  dependencies: ['core', 'codemirror', 'vendor'],
  includeCSS: true,
  createSourceMap: true,
  shimConfig: {
    alias: {
      'pgadmin.tools.debugger.ui': 'pgadmin/tools/debugger/static/js/debugger_ui',
    }
  },
  entry: [
    'pgadmin/tools/debugger/static/js/direct'
  ],
  stylesheets: [
    'pgadmin/tools/debugger/static/css/debugger.css',
  ],
  output: {
    path: path.resolve(
      __dirname,
      '../../pgadmin/tools/debugger/static/js/generated/'
    )
  },
};

module.exports = direct_debug;
