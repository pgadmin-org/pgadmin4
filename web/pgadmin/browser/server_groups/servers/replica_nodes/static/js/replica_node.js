/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import ReplicaNodeSchema from './replica_node.ui';

define('pgadmin.node.replica_nodes', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for replica nodes collection
  if (!pgBrowser.Nodes['coll-replica_nodes']) {
    pgBrowser.Nodes['coll-replica_nodes'] =
      pgBrowser.Collection.extend({
        node: 'replica_nodes',
        label: gettext('Replica Nodes'),
        type: 'coll-replica_nodes',
        columns: ['pid', 'name', 'usename', 'state'],
        canEdit: false,
        canDrop: false,
        canDropCascade: false,
      });
  }

  // Extend the browser's node class for replica nodes node
  if (!pgBrowser.Nodes['replica_nodes']) {
    pgBrowser.Nodes['replica_nodes'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'replica_nodes',
      epasHelp: false,
      sqlAlterHelp: '',
      sqlCreateHelp: '',
      dialogHelp: url_for('help.static', {'filename': 'replica_nodes_dialog.html'}),
      label: gettext('Replica Nodes'),
      hasSQL: false,
      hasScriptTypes: false,
      canDrop: false,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized) {
          return;
        }

        this.initialized = true;
      },

      getSchema: ()=>{
        return new ReplicaNodeSchema();
      },
    });
  }

  return pgBrowser.Nodes['coll-replica_nodes'];
});
