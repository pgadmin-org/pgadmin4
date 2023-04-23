/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePgaJobStepSchema } from './pga_jobstep.ui';

define('pgadmin.node.pga_jobstep', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
], function(gettext, url_for, pgBrowser) {

  if (!pgBrowser.Nodes['coll-pga_jobstep']) {
    pgBrowser.Nodes['coll-pga_jobstep'] =
      pgBrowser.Collection.extend({
        node: 'pga_jobstep',
        label: gettext('Steps'),
        type: 'coll-pga_jobstep',
        columns: [
          'jstid', 'jstname', 'jstenabled', 'jstkind', 'jstconntype',
          'jstonerror',
        ],
        hasStatistics: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['pga_jobstep']) {
    pgBrowser.Nodes['pga_jobstep'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_jobstep',
      dialogHelp: url_for('help.static', {'filename': 'pgagent_jobs.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '70%',
      height: '80%',
      canDrop: true,
      label: gettext('Step'),
      node_image: function() {
        return 'icon-pga_jobstep';
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_jobstep_on_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'},
        },{
          name: 'create_pga_jobstep_on_coll', node: 'coll-pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'},
        },{
          name: 'create_pga_jobstep', node: 'pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'},
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodePgaJobStepSchema(treeNodeInfo, itemNodeData);
      },

    });
  }

  return pgBrowser.Nodes['pga_job'];
});
