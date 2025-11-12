/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PgdReplicationGroupNodeSchema from './pgd_replication_group_node.ui';

define('pgadmin.node.pgd_replication_groups', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for replica nodes collection
  if (!pgBrowser.Nodes['coll-pgd_replication_groups']) {
    pgBrowser.Nodes['coll-pgd_replication_groups'] =
      pgBrowser.Collection.extend({
        node: 'pgd_replication_groups',
        label: gettext('PGD Replication Groups'),
        type: 'coll-pgd_replication_groups',
        columns: ['node_group_id', 'node_group_name', 'node_group_location'],
        canEdit: false,
        canDrop: false,
        canDropCascade: false,
        canSelect: false,
      });
  }

  // Extend the browser's node class for replica nodes node
  if (!pgBrowser.Nodes['pgd_replication_groups']) {
    pgBrowser.Nodes['pgd_replication_groups'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'pgd_replication_groups',
      epasHelp: false,
      sqlAlterHelp: '',
      sqlCreateHelp: '',
      dialogHelp: url_for('help.static', {'filename': 'pgd_replication_group_dialog.html'}),
      label: gettext('PGD Replication Group'),
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
        return new PgdReplicationGroupNodeSchema();
      },
    });
  }

  return pgBrowser.Nodes['coll-pgd_replication_groups'];
});
