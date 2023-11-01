/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.constraints', [
  'sources/gettext', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
  'pgadmin.node.unique_constraint', 'pgadmin.node.check_constraint',
  'pgadmin.node.foreign_key', 'pgadmin.node.exclusion_constraint',
  'pgadmin.node.primary_key',
], function(gettext, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-constraints']) {
    pgAdmin.Browser.Nodes['coll-constraints'] =
      pgAdmin.Browser.Collection.extend({
        node: 'constraints',
        label: gettext('Constraints'),
        type: 'coll-constraints',
        columns: ['name', 'comment'],
        canDrop: true,
        canDropCascade: true,
      });
  }

  if (!pgBrowser.Nodes['constraints']) {
    pgAdmin.Browser.Nodes['constraints'] = pgBrowser.Node.extend({
      type: 'constraints',
      label: gettext('Constraints'),
      collection_type: ['coll-constraints','coll-foreign_table'],
      parent_type: ['table','foreign_table'],
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([]);
      },
    });
  }

  return pgBrowser.Nodes['constraints'];
});
