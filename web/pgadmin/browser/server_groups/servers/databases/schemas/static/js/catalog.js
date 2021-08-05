/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CatalogSchema from './catalog.ui';

define('pgadmin.node.catalog', [
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, $, _, pgAdmin, pgBrowser) {

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
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'namespaceowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', readonly: true,
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        }]
      }),
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
