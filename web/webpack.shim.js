/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-env node */
//Configuration file contains requireJS like shim and paths used by webpack shim-loader
const path = require('path');

let webpackShimConfig = {
  shim: {
    'moment': {
      exports: 'moment',
    },
  },

  // Map module id to file path used in 'define(['baseurl', 'misc']). It is
  // used by webpack while creating bundle
  resolveAlias: {
    'top': path.join(__dirname, './pgadmin/'),
    'bundled_codemirror': path.join(__dirname, './pgadmin/static/bundle/codemirror'),
    'bundled_browser': path.join(__dirname, './pgadmin/static/bundle/browser'),
    'sources': path.join(__dirname, './pgadmin/static/js/'),
    'translations': path.join(__dirname, './pgadmin/tools/templates/js/translations'),
    'sources/gettext': path.join(__dirname, './pgadmin/static/js/gettext'),
    'sources/utils': path.join(__dirname, './pgadmin/static/js/utils'),
    'tools': path.join(__dirname, './pgadmin/tools/'),
    'pgbrowser': path.join(__dirname, './pgadmin/browser/static/js/'),
    'security.pages': path.join(__dirname, './pgadmin/static/js/SecurityPages/index.jsx'),

    // Vendor JS
    'moment': path.join(__dirname, './node_modules/moment/moment'),
    'dropzone': path.join(__dirname, './node_modules/dropzone/dist/dropzone'),
    'bignumber': path.join(__dirname, './node_modules/bignumber.js/bignumber'),
    'json-bignumber': path.join(__dirname, './node_modules/json-bignumber/dist/JSONBigNumber.min'),
    'jsoneditor.min': path.join(__dirname, './node_modules/jsoneditor/dist/jsoneditor.min'),
    'jsoneditor': path.join(__dirname, './node_modules/jsoneditor'),
    'color-picker': path.join(__dirname, './node_modules/@simonwep/pickr/dist/pickr.es5.min'),
    'mousetrap': path.join(__dirname, './node_modules/mousetrap'),
    'pathfinding':  path.join(__dirname, 'node_modules/pathfinding'),
    'dagre':  path.join(__dirname, 'node_modules/dagre'),
    'graphlib': path.join(__dirname, 'node_modules/graphlib'),
    'react': path.join(__dirname, 'node_modules/react'),
    'react-dom': path.join(__dirname, 'node_modules/react-dom'),
    'stylis': path.join(__dirname, 'node_modules/stylis'),
    'popper.js': path.join(__dirname, 'node_modules/popper.js'),

    //xterm
    'xterm': path.join(__dirname, './node_modules/xterm/lib/xterm.js'),
    'xterm-addon-fit': path.join(__dirname, './node_modules/xterm-addon-fit/lib/xterm-addon-fit.js'),
    'xterm-addon-web-links': path.join(__dirname, './node_modules/xterm-addon-web-links/lib/xterm-addon-web-links.js'),
    'xterm-addon-search': path.join(__dirname, './node_modules/xterm-addon-search/lib/xterm-addon-search.js'),

    //socket
    'socketio': path.join(__dirname, './node_modules/socket.io-client/dist/socket.io.js'),

    'pgadmin.about': path.join(__dirname, './pgadmin/about/static/js/about'),
    'pgadmin.authenticate.kerberos': path.join(__dirname, './pgadmin/authenticate/static/js/kerberos'),
    'pgadmin.browser': path.join(__dirname, './pgadmin/browser/static/js/browser'),
    'pgadmin.browser.bgprocessmanager': path.join(__dirname, './pgadmin/misc/bgprocess/static/js/'),
    'pgadmin.browser.collection': path.join(__dirname, './pgadmin/browser/static/js/collection'),
    'pgadmin.browser.events': path.join(__dirname, './pgadmin/browser/static/js/events'),
    'pgadmin.browser.endpoints': path.join(__dirname, './pgadmin/browser/static/js/endpoints'),
    'pgadmin.browser.constants': path.join(__dirname, './pgadmin/browser/static/js/constants'),
    'pgadmin.browser.keyboard': path.join(__dirname, './pgadmin/browser/static/js/keyboard'),
    'pgadmin.browser.activity': path.join(__dirname, './pgadmin/browser/static/js/activity'),
    'pgadmin.browser.messages': path.join(__dirname, './pgadmin/browser/js/messages'),
    'pgadmin.browser.node': path.join(__dirname, './pgadmin/browser/static/js/node'),
    'pgadmin.browser.utils': path.join(__dirname, './pgadmin/browser/js/utils'),
    'pgadmin.dashboard': path.join(__dirname, './pgadmin/dashboard/static/js/Dashboard'),
    'pgadmin.help': path.join(__dirname, './pgadmin/help/static/js/help'),
    'pgadmin.misc.cloud': path.join(__dirname, './pgadmin/misc/cloud/static/js/cloud'),
    'pgadmin.node.cast': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/casts/static/js/cast'),
    'pgadmin.node.publication': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/publications/static/js/publication'),
    'pgadmin.node.subscription': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/subscriptions/static/js/subscription'),
    'pgadmin.node.catalog': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/static/js/catalog'),
    'pgadmin.node.aggregate': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/aggregates/static/js/aggregate'),
    'pgadmin.node.catalog_object': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/static/js/catalog_object'),
    'pgadmin.node.catalog_object_column': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/columns/static/js/catalog_object_column'),
    'pgadmin.node.check_constraint': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/check_constraint/static/js/check_constraint'),
    'pgadmin.node.collation': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/collations/static/js/collation'),
    'pgadmin.node.column': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/columns/static/js/column'),
    'pgadmin.node.compound_trigger': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/compound_triggers/static/js/compound_trigger'),
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
    'pgadmin.node.foreign_table_column': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/foreign_tables/foreign_table_columns/static/js/foreign_table_column'),
    'pgadmin.node.fts_configuration': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_configurations/static/js/fts_configuration'),
    'pgadmin.node.fts_dictionary': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_dictionaries/static/js/fts_dictionary'),
    'pgadmin.node.fts_parser': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_parsers/static/js/fts_parser'),
    'pgadmin.node.fts_template': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/fts_templates/static/js/fts_template'),
    'pgadmin.node.function': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/function'),
    'pgadmin.node.index': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index'),
    'pgadmin.node.language': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/languages/static/js/language'),
    'pgadmin.node.mview': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/mview'),
    'pgadmin.node.operator': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/operators/static/js/operator'),
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
    'pgadmin.node.user_mapping': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/foreign_servers/user_mappings/static/js/user_mapping'),
    'pgadmin.node.view': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/view'),
    'pgadmin.node.row_security_policy': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/row_security_policies/static/js/row_security_policy'),
    'pgadmin.preferences': path.join(__dirname, './pgadmin/preferences/static/js/'),
    'pgadmin.settings': path.join(__dirname, './pgadmin/settings/static/js/settings'),
    'pgadmin.server.supported_servers': path.join(__dirname, '/browser/server/supported_servers'),
    'pgadmin.tables.js': path.join(__dirname, './pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/'),
    'pgadmin.tools.backup': path.join(__dirname, './pgadmin/tools/backup/static/js/backup'),
    'pgadmin.tools.debugger': path.join(__dirname, './pgadmin/tools/debugger/static/js/'),
    'pgadmin.tools.debugger.ui': path.join(__dirname, './pgadmin/tools/debugger/static/js/debugger_ui'),
    'pgadmin.tools.debugger.utils': path.join(__dirname, './pgadmin/tools/debugger/static/js/debugger_utils'),
    'pgadmin.tools.file_manager': path.join(__dirname, './pgadmin/misc/file_manager/static/js/index'),
    'pgadmin.tools.grant_wizard': path.join(__dirname, './pgadmin/tools/grant_wizard/static/js/grant_wizard'),
    'pgadmin.tools.import_export': path.join(__dirname, './pgadmin/tools/import_export/static/js/import_export'),
    'pgadmin.tools.import_export_servers': path.join(__dirname, './pgadmin/tools/import_export_servers/static/js/'),
    'pgadmin.tools.maintenance': path.join(__dirname, './pgadmin/tools/maintenance/static/js/maintenance'),
    'pgadmin.tools.restore': path.join(__dirname, './pgadmin/tools/restore/static/js/restore'),
    'pgadmin.tools.schema_diff': path.join(__dirname, './pgadmin/tools/schema_diff/static/js/'),
    'pgadmin.tools.search_objects': path.join(__dirname, './pgadmin/tools/search_objects/static/js/'),
    'pgadmin.tools.erd': path.join(__dirname, './pgadmin/tools/erd/static/js/'),
    'pgadmin.tools.psql_module': path.join(__dirname, './pgadmin/tools/psql/static/js/psql_module'),
    'pgadmin.tools.psql': path.join(__dirname, './pgadmin/tools/psql/static/js/'),
    'pgadmin.tools.sqleditor': path.join(__dirname, './pgadmin/tools/sqleditor/static/js/'),
    'pgadmin.tools.user_management': path.join(__dirname, './pgadmin/tools/user_management/static/js/user_management'),
    'pgadmin.user_management.current_user': '/user_management/current_user',
  },
  externals: [
    'pgadmin.user_management.current_user',
    'translations',
    'pgadmin.browser.endpoints',
    'pgadmin.browser.messages',
    'pgadmin.browser.utils',
    'pgadmin.server.supported_servers'
  ],
  // Define list of pgAdmin common libraries to bundle them separately
  // into commons JS from app.bundle.js
  pgLibs: [
    'pgadmin.browser.collection',
    'pgadmin.browser.events', 'pgadmin',
    'pgadmin.browser',
    'pgadmin.browser.node',
    'pgadmin.settings','pgadmin.sqlfoldcode',
  ],
  // Checks whether JS module is npm module or not
  isExternal: function(module) {
    let context = module.context;
    if (typeof context !== 'string') { return false; }
    return (context.indexOf('node_modules') !== -1 || context.indexOf('vendor') !== -1);
  },
  // Checks whether module is in pgLibs or not. Returns true if exists
  isPgAdminLib: function (module) {
    if (module.rawRequest === undefined) { return false; }
    return this.pgLibs.indexOf(module.rawRequest) !== -1;
  },
  isBrowserNode: function(module) {
    if (module.rawRequest === undefined) { return false; }
    if(module.rawRequest.startsWith('pgadmin.node')) {
      return true;
    }
    return false;
  },
  matchModules: function(module, match_modules) {
    if (module.rawRequest === undefined) { return false; }
    if(typeof match_modules === 'string') {
      if(module.rawRequest.indexOf(match_modules) >= 0) {
        return true;
      }
    } else {
      for(let value of match_modules) {
        if(module.rawRequest.indexOf(value) >= 0) {
          return true;
        }
      }
    }
    return false;
  },

  /* These will be skipped when webpack picks css/scss files recursively to bundle */
  css_bundle_skip: [
    './pgadmin/static',
  ],

  /* These will be included in array formed by recursive traversing for css/scss files */
  css_bundle_include: [
    './pgadmin/static/js/components/PgTree/scss/styles.scss',
    './pgadmin/static/scss/pgadmin.scss',
    './pgadmin/static/css/pgadmin.css',
  ],
};
module.exports = webpackShimConfig;
