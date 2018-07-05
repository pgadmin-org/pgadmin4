/* eslint-env node */
//Configuration file contains requireJS like shim and paths used by webpack shim-loader
const path = require('path');

var webpackShimConfig = {
  shim: {
    'moment': {
      exports: 'moment',
    },
    'underscore': {
      exports: '_',
    },
    'jquery': {
      'exports': '$',
    },
    'bootstrap': {
      'deps': ['jquery'],
    },
    'select2': {
      'deps': ['jquery'],
      'exports': '$.fn.select2',
    },
    'bootstrap.datepicker': {
      'deps': ['jquery', 'bootstrap'],
      'exports': 'jQuery.fn.datepicker',
    },
    'bootstrap.datetimepicker': {
      'exports': 'jQuery.fn.datetimepicker',
    },
    'bootstrap.switch': {
      deps: ['jquery', 'bootstrap'],
      'exports': '$.fn.bootstrapSwitch',
    },
    'backbone': {
      exports: 'Backbone', // Once loaded, use the global 'Backbone' as the module value.
      deps: [
        'underscore', // just make sure that underscore is loaded before (uses it's global value)
        'jquery:$', // Provide jquery as dependency with name $
      ],
    },
    'backgrid': {
      'deps': ['backform'],
      'exports': 'Backgrid',
    },
    'pgadmin.backform': {
      'deps': ['backform', 'pgadmin.backgrid', 'select2'],
    },
    'pgadmin.backgrid': {
      'deps': ['backgrid', 'bootstrap.datetimepicker', 'bootstrap.switch'],
    },

    'backgrid.select.all': {
      'deps': ['backgrid'],
    },
    'backgrid.paginator': {
      'deps': ['backgrid', 'backbone.paginator'],
    },
    'backgrid.filter': {
      'deps': ['backgrid'],
    },
    'backgrid.sizeable.columns': {
      'deps': ['backgrid'],
    },
    'jquery.event.drag': {
      'deps': ['jquery'], 'exports': 'jQuery.fn.drag',
    },
    'jquery.ui': {'deps': ['jquery']},
    'slick.pgadmin.formatters': {
      'deps': ['slickgrid'],
    },
    'slick.pgadmin.editors': {
      'deps': ['slickgrid'],
    },
    'slickgrid': {
      'deps': ['jquery', 'jquery.ui', 'jquery.event.drag'],
      'exports': 'Slick',
    },
    'flotr2': {
      deps: ['bean'],
    },
    'alertify': {
      'exports': 'alertify',
    },
    'jqueryui.position': {
      'deps': ['jquery'],
      'exports': 'jQuery.ui.position',
    },
    'jquery.contextmenu': {
      'deps': ['jquery', 'jqueryui.position'],
      'exports': 'jQuery.contextMenu',
    },
    'jquery.aciplugin': {
      'deps': ['jquery'],
      'exports': 'aciPluginClass',
    },
    'jquery.acitree': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciTree',
    },
    'jquery.acisortable': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciSortable',
    },
    'jquery.acifragment': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciFragment',
    },
    'wcdocker': {
      'deps': ['jquery.contextmenu'],
    },
    'pgadmin.browser.messages': {
      'deps': ['pgadmin.browser.datamodel'],
    },
    'spectrum': {
      'deps': ['jquery'],
      'exports': '$.fn.spectrum',
    },
  },

  // Map module id to file path used in 'define(['baseurl', 'misc']). It is
  // used by webpack while creating bundle
  resolveAlias: {
    'top': path.join(__dirname, './pgadmin'),
    'bundled_codemirror': path.join(__dirname, './pgadmin/static/bundle/codemirror'),
    'bundled_browser': path.join(__dirname, './pgadmin/static/bundle/browser'),
    'sources': path.join(__dirname, './pgadmin/static/js'),
    'sourcesjsx': path.join(__dirname, './pgadmin/static/jsx'),
    'pgadmin': path.join(__dirname, './pgadmin/static/js/pgadmin'),
    'translations': path.join(__dirname, './pgadmin/tools/templates/js/translations'),
    'sources/gettext': path.join(__dirname, './pgadmin/static/js/gettext'),
    'sources/utils': path.join(__dirname, './pgadmin/static/js/utils'),
    'babel-polyfill': path.join(__dirname, './node_modules/babel-polyfill/dist/polyfill'),
    'tools': path.join(__dirname, './pgadmin/tools/'),
    'pgbrowser': path.join(__dirname, './pgadmin/browser/static/js/'),

    // Vendor JS
    'jquery': path.join(__dirname, './node_modules/jquery/dist/jquery'),
    'wcdocker': path.join(__dirname, './node_modules/webcabin-docker/Build/wcDocker'),
    'alertify': path.join(__dirname, './node_modules/alertifyjs/build/alertify'),
    'moment': path.join(__dirname, './node_modules/moment/moment'),
    'jquery.event.drag': path.join(__dirname, './node_modules/slickgrid/lib/jquery.event.drag-2.3.0'),
    'jquery.ui': path.join(__dirname, './node_modules/slickgrid/lib/jquery-ui-1.11.3'),
    'flotr2': path.join(__dirname, './node_modules/flotr2/flotr2.amd'),
    'bean': path.join(__dirname, './node_modules/flotr2/lib/bean'),
    'jqueryui.position': path.join(__dirname, './node_modules/jquery-contextmenu/dist/jquery.ui.position'),
    'jquery.contextmenu': path.join(__dirname, './node_modules/jquery-contextmenu/dist/jquery.contextMenu'),
    'dropzone': path.join(__dirname, './node_modules/dropzone/dist/dropzone'),
    'bignumber': path.join(__dirname, './node_modules/bignumber.js/bignumber'),
    'snap.svg': path.join(__dirname, './node_modules/snapsvg/dist/snap.svg'),
    'spectrum': path.join(__dirname, './node_modules/spectrum-colorpicker/spectrum'),
    'mousetrap': path.join(__dirname, './node_modules/mousetrap'),

    // AciTree
    'jquery.acitree': path.join(__dirname, './node_modules/acitree/js/jquery.aciTree.min'),
    'jquery.aciplugin': path.join(__dirname, './node_modules/acitree/js/jquery.aciPlugin.min'),
    'jquery.acisortable': path.join(__dirname, './node_modules/acitree/js/jquery.aciSortable.min'),
    'jquery.acifragment': path.join(__dirname, './node_modules/acitree/js/jquery.aciFragment.min'),

    // Backbone and Backgrid
    'backbone': path.join(__dirname, './node_modules/backbone/backbone'),
    'backbone.undo': path.join(__dirname, './node_modules/backbone-undo/Backbone.Undo'),
    'backform': path.join(__dirname, './node_modules/backform/src/backform'),
    'backgrid': path.join(__dirname, './node_modules/backgrid/lib/backgrid'),
    'bootstrap.datetimepicker': path.join(__dirname, './node_modules/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min'),
    'bootstrap.switch': path.join(__dirname, './node_modules/bootstrap-switch/dist/js/bootstrap-switch'),
    'select2': path.join(__dirname, './node_modules/select2/dist/js/select2.full'),
    'backgrid.filter': path.join(__dirname, './node_modules/backgrid-filter/backgrid-filter'),
    'backgrid.sizeable.columns': path.join(__dirname, './node_modules/backgrid-sizeable-columns/backgrid-sizeable-columns'),
    'backgrid.select.all': path.join(__dirname, './node_modules/backgrid-select-all/backgrid-select-all'),
    'pgadmin.alertifyjs': path.join(__dirname, './pgadmin/static/js/alertify.pgadmin.defaults'),
    'pgadmin.backform': path.join(__dirname, './pgadmin/static/js/backform.pgadmin'),
    'pgadmin.backgrid': path.join(__dirname, './pgadmin/static/js/backgrid.pgadmin'),

    'pgadmin.about': path.join(__dirname, './pgadmin/about/static/js/about'),
    'pgadmin.browser': path.join(__dirname, './pgadmin/browser/static/js/browser'),
    'pgadmin.browser.bgprocess': path.join(__dirname, './pgadmin/misc/bgprocess/static/js/bgprocess'),
    'pgadmin.browser.collection': path.join(__dirname, './pgadmin/browser/static/js/collection'),
    'pgadmin.browser.datamodel': path.join(__dirname, './pgadmin/browser/static/js/datamodel'),
    'pgadmin.browser.endpoints': '/browser/js/endpoints',
    'pgadmin.browser.error': path.join(__dirname, './pgadmin/browser/static/js/error'),
    'pgadmin.browser.frame': path.join(__dirname, './pgadmin/browser/static/js/frame'),
    'pgadmin.browser.keyboard': path.join(__dirname, './pgadmin/browser/static/js/keyboard'),
    'pgadmin.browser.preferences': path.join(__dirname, './pgadmin/browser/static/js/preferences'),
    'pgadmin.browser.menu': path.join(__dirname, './pgadmin/browser/static/js/menu'),
    'pgadmin.browser.messages': '/browser/js/messages',
    'pgadmin.browser.node': path.join(__dirname, './pgadmin/browser/static/js/node'),
    'pgadmin.browser.node.ui': path.join(__dirname, './pgadmin/browser/static/js/node.ui'),
    'pgadmin.browser.object_depends': path.join(__dirname, './pgadmin/misc/depends/static/js/depends'),
    'pgadmin.browser.object_sql': path.join(__dirname, './pgadmin/misc/sql/static/js/sql'),
    'pgadmin.browser.object_statistics': path.join(__dirname, './pgadmin/misc/statistics/static/js/statistics'),
    'pgadmin.browser.panel': path.join(__dirname, './pgadmin/browser/static/js/panel'),
    'pgadmin.browser.server.privilege': path.join(__dirname, './pgadmin/browser/server_groups/servers/static/js/privilege'),
    'pgadmin.browser.server.variable': path.join(__dirname, './pgadmin/browser/server_groups/servers/static/js/variable'),
    'pgadmin.browser.table.partition.utils': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/partition.utils'),
    'pgadmin.browser.utils': '/browser/js/utils',
    'pgadmin.browser.wizard': path.join(__dirname, './pgadmin/browser/static/js/wizard'),
    'pgadmin.dashboard': path.join(__dirname, './pgadmin/dashboard/static/js/dashboard'),
    'pgadmin.datagrid': path.join(__dirname, './pgadmin/tools/datagrid/static/js/datagrid'),
    'pgadmin.file_manager': path.join(__dirname, './pgadmin/misc/file_manager/static/js/file_manager'),
    'pgadmin.file_utility': path.join(__dirname, './pgadmin/misc/file_manager/static/js/utility'),
    'pgadmin.misc.explain': path.join(__dirname, './pgadmin/misc/static/explain/js/explain'),
    'pgadmin.node.cast': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/casts/static/js/cast'),
    'pgadmin.node.catalog': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/static/js/catalog'),
    'pgadmin.node.catalog_object': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/static/js/catalog_object'),
    'pgadmin.node.catalog_object_column': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/columns/static/js/catalog_object_column'),
    'pgadmin.node.check_constraint': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/check_constraint/static/js/check_constraint'),
    'pgadmin.node.collation': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/collations/static/js/collation'),
    'pgadmin.node.column': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/column/static/js/column'),
    'pgadmin.node.constraints': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/static/js/constraints'),
    'pgadmin.node.database': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/static/js/database'),
    'pgadmin.node.domain': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/domains/static/js/domain'),
    'pgadmin.node.domain_constraints': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/domains/domain_constraints/static/js/domain_constraints'),
    'pgadmin.node.event_trigger': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/event_triggers/static/js/event_trigger'),
    'pgadmin.node.edbfunc': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/packages/edbfuncs/static/js/edbfunc'),
    'pgadmin.node.edbproc': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/packages/edbfuncs/static/js/edbproc'),
    'pgadmin.node.edbvar': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/packages/edbvars/static/js/edbvar'),
    'pgadmin.node.exclusion_constraint': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/exclusion_constraint/static/js/exclusion_constraint'),
    'pgadmin.node.extension': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/extensions/static/js/extension'),
    'pgadmin.node.external_table': path.join(__dirname, './pgadmin/static/js/browser/server_groups/servers/databases/external_tables/index'),
    'pgadmin.node.foreign_data_wrapper': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/static/js/foreign_data_wrapper'),
    'pgadmin.node.foreign_key': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/js/foreign_key'),
    'pgadmin.node.foreign_server': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/foreign_servers/static/js/foreign_server'),
    'pgadmin.node.foreign_table': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/foreign_tables/static/js/foreign_table'),
    'pgadmin.node.fts_configuration': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_configurations/static/js/fts_configuration'),
    'pgadmin.node.fts_dictionary': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_dictionaries/static/js/fts_dictionary'),
    'pgadmin.node.fts_parser': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_parser/static/js/fts_parser'),
    'pgadmin.node.fts_template': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_templates/static/js/fts_template'),
    'pgadmin.node.function': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/function'),
    'pgadmin.node.index': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index'),
    'pgadmin.node.language': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/languages/static/js/language'),
    'pgadmin.node.mview': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/mview'),
    'pgadmin.node.package': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/packages/static/js/package'),
    'pgadmin.node.partition': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/partitions/static/js/partition'),
    'pgadmin.node.pga_job': path.join(__dirname, './pgadmin/browser/server_groups/servers/pgagent/static/js/pga_job'),
    'pgadmin.node.pga_jobstep': path.join(__dirname, './pgadmin/browser/server_groups/servers/pgagent/steps/static/js/pga_jobstep'),
    'pgadmin.node.pga_schedule': path.join(__dirname, './pgadmin/browser/server_groups/servers/pgagent/schedules/static/js/pga_schedule'),
    'pgadmin.node.primary_key': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/js/primary_key'),
    'pgadmin.node.procedure': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/procedure'),
    'pgadmin.node.resource_group': path.join(__dirname, './pgadmin/browser/server_groups/servers/resource_groups/static/js/resource_group'),
    'pgadmin.node.role': path.join(__dirname, './pgadmin/browser/server_groups/servers/roles/static/js/role'),
    'pgadmin.node.rule': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/rules/static/js/rule'),
    'pgadmin.node.schema': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/static/js/schema'),
    'pgadmin.node.schema.dir': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/static/js/'),
    'pgadmin.node.sequence': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/sequences/static/js/sequence'),
    'pgadmin.node.server': path.join(__dirname, './pgadmin/browser/server_groups/servers/static/js/server'),
    'pgadmin.node.server_group': path.join(__dirname, './pgadmin/browser/server_groups/static/js/server_group'),
    'pgadmin.node.synonym': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/synonyms/static/js/synonym'),
    'pgadmin.node.table': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table'),
    'pgadmin.node.tablespace': path.join(__dirname, './pgadmin/browser/server_groups/servers/tablespaces/static/js/tablespace'),
    'pgadmin.node.trigger': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/triggers/static/js/trigger'),
    'pgadmin.node.trigger_function': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/trigger_function'),
    'pgadmin.node.type': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/types/static/js/type'),
    'pgadmin.node.unique_constraint': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/js/unique_constraint'),
    'pgadmin.node.user_mapping': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/foreign_servers/user_mapping/static/js/user_mapping'),
    'pgadmin.node.view': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/view'),
    'pgadmin.preferences': path.join(__dirname, './pgadmin/preferences/static/js/preferences'),
    'pgadmin.settings': path.join(__dirname, './pgadmin/settings/static/js/settings'),
    'pgadmin.server.supported_servers': '/browser/server/supported_servers',
    'pgadmin.sqleditor': path.join(__dirname, './pgadmin/tools/sqleditor/static/js/sqleditor'),
    'pgadmin.tables.js': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/'),
    'pgadmin.tools.backup': path.join(__dirname, './pgadmin/tools/backup/static/js/backup'),
    'pgadmin.tools.debugger.controller': path.join(__dirname, './pgadmin/tools/debugger/static/js/debugger'),
    'pgadmin.tools.debugger.direct': path.join(__dirname, './pgadmin/tools/debugger/static/js/direct'),
    'pgadmin.tools.debugger.ui': path.join(__dirname, './pgadmin/tools/debugger/static/js/debugger_ui'),
    'pgadmin.tools.debugger.utils': path.join(__dirname, './pgadmin/tools/debugger/static/js/debugger_utils'),
    'pgadmin.tools.grant_wizard': path.join(__dirname, './pgadmin/tools/grant_wizard/static/js/grant_wizard'),
    'pgadmin.tools.import_export': path.join(__dirname, './pgadmin/tools/import_export/static/js/import_export'),
    'pgadmin.tools.maintenance': path.join(__dirname, './pgadmin/tools/maintenance/static/js/maintenance'),
    'pgadmin.tools.restore': path.join(__dirname, './pgadmin/tools/restore/static/js/restore'),
    'pgadmin.tools.user_management': path.join(__dirname, './pgadmin/tools/user_management/static/js/user_management'),
    'pgadmin.user_management.current_user': '/user_management/current_user',
    'slick.pgadmin.editors': path.join(__dirname, './pgadmin/tools/../static/js/slickgrid/editors'),
    'slick.pgadmin.formatters': path.join(__dirname, './pgadmin/tools/../static/js/slickgrid/formatters'),
  },
  externals: [
    'pgadmin.user_management.current_user',
    'translations',
    'pgadmin.browser.endpoints',
    'pgadmin.browser.messages',
    'pgadmin.browser.utils',
    'pgadmin.server.supported_servers',
  ],
  // Define list of pgAdmin common libraries to bundle them separately
  // into commons JS from app.bundle.js
  pgLibs: [
    'pgadmin.browser.wizard', 'pgadmin.browser.error', 'pgadmin.browser.server.privilege',
    'pgadmin.browser.server.variable', 'pgadmin.browser.collection', 'pgadmin.browser.node.ui',
    'pgadmin.browser.datamodel', 'pgadmin.browser.menu', 'pgadmin.browser.panel', 'pgadmin',
    'pgadmin.browser.frame', 'slick.pgadmin.editors', 'slick.pgadmin.formatters',
    'pgadmin.backform', 'pgadmin.backgrid', 'pgadmin.browser', 'pgadmin.file_manager',
    'pgadmin.file_utility', 'pgadmin.browser.node',
    'pgadmin.alertifyjs', 'pgadmin.settings', 'pgadmin.preferences', 'pgadmin.sqlfoldcode',
  ],
  // Checks whether JS module is npm module or not
  isExternal: function(module) {
    var context = module.context;
    if (typeof context !== 'string') { return false; }
    return context.indexOf('node_modules') !== -1;
  },
  // Checks whether module is in pgLibs or not. Returns true if exists
  isPgAdminLib: function (module) {
    if (module.rawRequest === undefined) { return false; }
    return this.pgLibs.indexOf(module.rawRequest) !== -1;
  },
};
module.exports = webpackShimConfig;
