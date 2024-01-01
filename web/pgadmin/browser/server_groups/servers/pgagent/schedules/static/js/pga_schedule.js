/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PgaJobScheduleSchema from './pga_schedule.ui';

define('pgadmin.node.pga_schedule', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
], function(
  gettext, url_for, pgBrowser
) {

  if (!pgBrowser.Nodes['coll-pga_schedule']) {
    pgBrowser.Nodes['coll-pga_schedule'] =
      pgBrowser.Collection.extend({
        node: 'pga_schedule',
        label: gettext('Schedules'),
        type: 'coll-pga_schedule',
        columns: ['jscid', 'jscname', 'jscenabled'],
        hasStatistics: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['pga_schedule']) {
    pgBrowser.Nodes['pga_schedule'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_schedule',
      dialogHelp: url_for('help.static', {'filename': 'pgagent_jobs.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: false,
      canDrop: true,
      label: gettext('Schedule'),
      node_image: 'icon-pga_schedule',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_schedule_on_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          data: {action: 'create'},
        },{
          name: 'create_pga_schedule_on_coll', node: 'coll-pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          data: {action: 'create'},
        },{
          name: 'create_pga_schedule', node: 'pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          data: {action: 'create'},
        }]);
      },

      getSchema: function() {
        return new PgaJobScheduleSchema();
      },
    });
  }

  return pgBrowser.Nodes['pga_schedule'];
});
