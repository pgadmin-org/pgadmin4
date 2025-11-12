/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PgdReplicationServerNodeSchema from './pgd_replication_server_node.ui';

define('pgadmin.node.pgd_replication_servers', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for replica nodes collection
  if (!pgBrowser.Nodes['coll-pgd_replication_servers']) {
    pgBrowser.Nodes['coll-pgd_replication_servers'] =
      pgBrowser.Collection.extend({
        node: 'pgd_replication_servers',
        label: gettext('Servers'),
        type: 'coll-pgd_replication_servers',
        columns: ['node_seq_id', 'node_id', 'node_name', 'node_kind_name', 'node_group_name'],
        canEdit: false,
        canDrop: false,
        canDropCascade: false,
        canSelect: false,
      });
  }

  // Extend the browser's node class for replica nodes node
  if (!pgBrowser.Nodes['pgd_replication_servers']) {
    pgBrowser.Nodes['pgd_replication_servers'] = pgBrowser.Node.extend({
      parent_type: 'pgd_replication_groups',
      type: 'pgd_replication_servers',
      epasHelp: false,
      sqlAlterHelp: '',
      sqlCreateHelp: '',
      dialogHelp: url_for('help.static', {'filename': 'pgd_replication_server_dialog.html'}),
      label: gettext('Server'),
      hasSQL: false,
      hasScriptTypes: false,
      canDrop: false,
      node_image: function(r) {
        if(r.icon) {
          return r.icon;
        }
        return 'icon-server-not-connected';
      },
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized) {
          return;
        }

        this.initialized = true;
      },

      getSchema: ()=>{
        return new PgdReplicationServerNodeSchema();
      },
    });
  }

  return pgBrowser.Nodes['coll-pgd_replication_servers'];
});
