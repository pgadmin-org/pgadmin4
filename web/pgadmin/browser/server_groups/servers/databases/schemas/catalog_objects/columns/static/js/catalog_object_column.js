/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import CatalogObjectColumnSchema from './catalog_object_column.ui';

define('pgadmin.node.catalog_object_column', [
  'sources/gettext', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-catalog_object_column']) {
    pgAdmin.Browser.Nodes['coll-catalog_object_column'] =
      pgAdmin.Browser.Collection.extend({
        node: 'catalog_object_column',
        label: gettext('catalog_object_column'),
        type: 'coll-catalog_object_column',
        columns: ['attname', 'attnum', 'cltype', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['catalog_object_column']) {
    pgAdmin.Browser.Nodes['catalog_object_column'] =
      pgAdmin.Browser.Node.extend({
        parent_type: 'catalog_object',
        type: 'catalog_object_column',
        label: gettext('catalog_object_column'),
        hasSQL:  false,
        hasScriptTypes: [],
        hasDepends: true,
        Init: function() {
        /* Avoid mulitple registration of menus */
          if (this.initialized)
            return;

          this.initialized = true;

        },
        getSchema: function() {
          return new CatalogObjectColumnSchema();
        },
      });
  }

  return pgBrowser.Nodes['catalog_object_column'];
});
