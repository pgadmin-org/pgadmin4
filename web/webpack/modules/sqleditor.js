/* eslint-env node */
const path = require('path');

var sqleditor = {
  name: 'sqleditor',
  dependencies: ['core', 'slickgrid', 'codemirror', 'vendor', 'react'],
  includeCSS: true,
  createSourceMap: true,
  entry: [
    'pga_sqleditor/js/sqleditor.js',
    'pgadmin.sqleditor.query_history'
  ],
  stylesheets: ['pgadmin/tools/sqleditor/static/css/sqleditor.css'],
  output: {
    path: path.resolve(
      __dirname,
      '../../pgadmin/tools/sqleditor/static/js/generated/'
    )
  },
  shimConfig: {
    alias: {
      'pgadmin.sqleditor.query_history': 'pgadmin/tools/sqleditor/static/jsx/history/query_history.jsx',
      'pga_sqleditor': 'pgadmin/tools/sqleditor/static/'
    }
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};

module.exports = sqleditor;
