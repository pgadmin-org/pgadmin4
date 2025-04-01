/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import ReplicaNodeSchema from './replica_node.ui';

define('pgadmin.node.replica_node', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for replica nodes collection
  if (!pgBrowser.Nodes['coll-replica_node']) {
    pgBrowser.Nodes['coll-replica_node'] =
      pgBrowser.Collection.extend({
        node: 'replica_node',
        label: gettext('Replica Nodes'),
        type: 'coll-replica_node',
        columns: ['pid', 'name', 'usename', 'state'],
        canEdit: false,
        canDrop: false,
        canDropCascade: false,
      });
  }

  // Extend the browser's node class for replica nodes node
  if (!pgBrowser.Nodes['replica_node']) {
    pgBrowser.Nodes['replica_node'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'replica_node',
      epasHelp: false,
      sqlAlterHelp: '',
      sqlCreateHelp: '',
      dialogHelp: url_for('help.static', {'filename': 'replica_node_dialog.html'}),
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

  return pgBrowser.Nodes['coll-replica_node'];
});
