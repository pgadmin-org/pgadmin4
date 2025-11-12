/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import DBMSScheduleSchema from './dbms_schedule.ui';

define('pgadmin.node.dbms_schedule', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-dbms_schedule']) {
    pgBrowser.Nodes['coll-dbms_schedule'] =
      pgBrowser.Collection.extend({
        node: 'dbms_schedule',
        label: gettext('DBMS Schedules'),
        type: 'coll-dbms_schedule',
        columns: ['jsscname', 'jsscrepeatint', 'jsscdesc'],
        hasSQL:  false,
        hasDepends: false,
        hasStatistics: false,
        hasScriptTypes: [],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['dbms_schedule']) {
    pgAdmin.Browser.Nodes['dbms_schedule'] = pgAdmin.Browser.Node.extend({
      parent_type: 'dbms_job_scheduler',
      type: 'dbms_schedule',
      label: gettext('DBMS Schedule'),
      node_image: 'icon-pga_schedule',
      epasHelp: true,
      epasURL: 'https://www.enterprisedb.com/docs/epas/$VERSION$/epas_compat_bip_guide/03_built-in_packages/15_dbms_scheduler/04_create_schedule/',
      dialogHelp: url_for('help.static', {'filename': 'dbms_schedule.html'}),
      canDrop: true,
      hasSQL:  true,
      hasDepends: false,
      hasStatistics: false,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_dbms_schedule_on_coll', node: 'coll-dbms_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Schedule...'),
          data: {action: 'create'},
        },{
          name: 'create_dbms_schedule', node: 'dbms_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Schedule...'),
          data: {action: 'create'},
        },{
          name: 'create_dbms_schedule', node: 'dbms_job_scheduler', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Schedule...'),
          data: {action: 'create'},
        },
        ]);
      },
      getSchema: ()=>new DBMSScheduleSchema(),

    });
  }

  return pgBrowser.Nodes['dbms_schedule'];
});
