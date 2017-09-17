/* eslint-env node */
const path = require('path');

var core = {
  name: 'core',
  isReference: true,
  includeCSS: true,
  createSourceMap: true,
  dependencies: ['codemirror', 'slickgrid', 'vendor'],
  entry: [
    'pgadmin.backgrid', 'pgadmin.backform',
    'pgadmin.alertifyjs', 'sources/gettext', 'sources/url_for',
    'sources/size_prettify', 'sources/sqleditor_utils',
    'sources/check_node_visibility', 'pgadmin.browser.datamodel',
    'pgadmin.file_manager', 'pgadmin.settings', 'pgadmin.preferences',
    'sources/pgadmin', 'pgadmin.browser.server.privilege', 'pgadmin.browser',
    'pgadmin.browser.server.variable', 'pgadmin.browser.wizard',
    'pgadmin.browser.panel', 'pgadmin.browser.error',
    'pgadmin.browser.node', 'pgadmin.browser.frame',
    'pgadmin.browser.collection', 'pgadmin.browser.menu',
    'pgadmin.misc.explain', 'pgadmin.misc.file_manager',
    'pgadmin.browser.node.ui', 'pgadmin.browser.tool',
    'pgadmin.about',
  ],
  stylesheets: [
    'pgadmin/static/css/style.css', 'pgadmin/static/scss/pgadmin.scss',
  ],
  externals: [
    'pgadmin.browser.messages', 'pgadmin.server.supported_servers',
    'pgadmin.browser.utils', 'pgadmin.user_management.current_user',
    'translations', 'pgadmin.browser.endpoints', 'sources/generated/codemirror',
    'sources/generated/slickgrid',
  ],
  shimConfig: {
    alias: {
      'pgadmin.browser': 'pgadmin/browser/static/js/browser',
      'pgadmin.browser.tool': 'pgadmin/browser/static/js/tools',
      'pgadmin.alertifyjs': 'pgadmin/static/js/alertify.pgadmin.defaults',
      'pgadmin.backform': 'pgadmin/static/js/backform.pgadmin',
      'pgadmin.backgrid': 'pgadmin/static/js/backgrid.pgadmin',
      'sources': 'pgadmin/static/js',
      'pgadmin.file_manager': 'pgadmin/misc/file_manager/static/js/file_manager',
      'pgadmin.preferences': 'pgadmin/preferences/static/js/preferences',
      'pgadmin.settings': 'pgadmin/settings/static/js/settings',
      'pgadmin.browser.datamodel': 'pgadmin/browser/static/js/datamodel',
      'pgadmin.backgrid': 'pgadmin/static/js/backgrid.pgadmin',
      'pgadmin.backform': 'pgadmin/static/js/backform.pgadmin',
      'pgadmin.browser.server.privilege': 'pgadmin/browser/server_groups/servers/static/js/privilege',
      'pgadmin.browser.server.variable': 'pgadmin/browser/server_groups/servers/static/js/variable',
      'pgadmin.browser.panel': 'pgadmin/browser/static/js/panel',
      'pgadmin.browser.error': 'pgadmin/browser/static/js/error',
      'pgadmin.browser.node': 'pgadmin/browser/static/js/node',
      'pgadmin.browser.frame': 'pgadmin/browser/static/js/frame',
      'pgadmin.browser.collection': 'pgadmin/browser/static/js/collection',
      'pgadmin.browser.menu': 'pgadmin/browser/static/js/menu',
      'pgadmin.browser.node.ui': 'pgadmin/browser/static/js/node.ui',
      'pgadmin.browser.wizard': 'pgadmin/browser/static/js/wizard',
      'pgadmin.misc.explain': 'pgadmin/misc/static/explain/js/explain',
      'pgadmin.misc.file_manager': 'pgadmin/misc/file_manager/static/js/file_manager',
      'pgadmin.about': 'pgadmin/about/static/js/about',
    }
  }
};

module.exports = core;
