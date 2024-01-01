/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CatalogSchema from './catalog.ui';

define('pgadmin.node.catalog', [
  'sources/gettext', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, pgBrowser) {

  // Extend the browser's collection class for catalog collection
  if (!pgBrowser.Nodes['coll-catalog']) {
    pgBrowser.Nodes['coll-catalog'] =
      pgBrowser.Collection.extend({
        node: 'catalog',
        label: gettext('Catalogs'),
        type: 'coll-catalog',
        columns: ['name', 'namespaceowner', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }
  // Extend the browser's node class for catalog node
  if (!pgBrowser.Nodes['catalog']) {
    pgBrowser.Nodes['catalog'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'catalog',
      label: gettext('Catalog'),
      hasSQL:  true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

      },
      getSchema: function(treeNodeInfo) {
        return new CatalogSchema(
          {
            namespaceowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name
          }
        );
      }
    });

  }

  return pgBrowser.Nodes['catalog'];
});
