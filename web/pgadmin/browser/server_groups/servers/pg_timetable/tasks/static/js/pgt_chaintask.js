/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePgtChainTaskSchema } from './pgt_chaintask.ui';

define('pgadmin.node.pgt_chaintask', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
], function(gettext, url_for, pgBrowser) {

  if (!pgBrowser.Nodes['coll-pgt_chaintask']) {
    pgBrowser.Nodes['coll-pgt_chaintask'] =
      pgBrowser.Collection.extend({
        node: 'pgt_chaintask',
        label: gettext('Tasks'),
        type: 'coll-pgt_chaintask',
        columns: [
          'task_id', 'task_name',  'kind',
          'ignore_error',
        ],
        hasStatistics: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['pgt_chaintask']) {
    pgBrowser.Nodes['pgt_chaintask'] = pgBrowser.Node.extend({
      parent_type: 'pgt_chain',
      type: 'pgt_chaintask',
      dialogHelp: url_for('help.static', {'filename': 'pgtimetable_chains.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '70%',
      height: '80%',
      canDrop: true,
      label: gettext('Task'),
      node_image: function() {
        return 'icon-pgt_chaintask';
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pgt_chaintask_on_job', node: 'pgt_chain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Chain Task...'),
          data: {'action': 'create'},
        },{
          name: 'create_pgt_chaintask_on_coll', node: 'coll-pgt_chaintask', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Chain Task...'),
          data: {'action': 'create'},
        },{
          name: 'create_pgt_chaintask', node: 'pgt_chaintask', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Chain Task...'),
          data: {'action': 'create'},
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodePgtChainTaskSchema(treeNodeInfo, itemNodeData);
      },

    });
  }

  return pgBrowser.Nodes['pgt_chaintask'];
});
