/* eslint-env node */

module.exports = {
  name: 'tools',
  isReference: true,
  createSourceMap: true,
  dependencies: ['core', 'nodes', 'vendor'],
  entry: [
    'pgadmin.tools.backup', 'pgadmin.tools.user_management',
    'pgadmin.tools.debugger.ui', 'pgadmin.tools.grant_wizard',
    'pgadmin.tools.restore', 'pgadmin.tools.debugger.direct',
    'pgadmin.tools.import_export', 'pgadmin.tools.debugger.controller',
    'pgadmin.tools.maintenance', 'pgadmin.datagrid', 'pgadmin.misc.depends',
    'pgadmin.misc.sql', 'pgadmin.misc.statistics',
  ],
  resolve: {
    modules: ['.', 'node_modules']
  },
  shimConfig: {
    alias: {
      'pgadmin.tools.backup': 'pgadmin/tools/backup/static/js/backup',
      'pgadmin.tools.user_management': 'pgadmin/tools/user_management/static/js/user_management',
      'pgadmin.tools.debugger.ui': 'pgadmin/tools/debugger/static/js/debugger_ui',
      'pgadmin.tools.grant_wizard': 'pgadmin/tools/grant_wizard/static/js/grant_wizard',
      'pgadmin.tools.restore': 'pgadmin/tools/restore/static/js/restore',
      'pgadmin.tools.debugger.direct': 'pgadmin/tools/debugger/static/js/direct',
      'pgadmin.tools.import_export': 'pgadmin/tools/import_export/static/js/import_export',
      'pgadmin.tools.debugger.controller': 'pgadmin/tools/debugger/static/js/debugger',
      'pgadmin.tools.maintenance': 'pgadmin/tools/maintenance/static/js/maintenance',
      'pgadmin.datagrid': 'pgadmin/tools/datagrid/static/js/datagrid',
      'pgadmin.misc.depends': 'pgadmin/misc/depends/static/js/depends',
      'pgadmin.misc.sql': 'pgadmin/misc/sql/static/js/sql',
      'pgadmin.misc.statistics': 'pgadmin/misc/statistics/static/js/statistics',
    }
  }
};
