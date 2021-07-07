/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CatalogObjectSchema from './catalog_object.ui';

define('pgadmin.node.catalog_object', [
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, $, _, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-catalog_object']) {
    pgAdmin.Browser.Nodes['coll-catalog_object'] =
      pgAdmin.Browser.Collection.extend({
        node: 'catalog_object',
        label: gettext('Catalog Objects'),
        type: 'coll-catalog_object',
        columns: ['name', 'owner', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['catalog_object']) {
    pgAdmin.Browser.Nodes['catalog_object'] = pgAdmin.Browser.Node.extend({
      parent_type: 'catalog',
      type: 'catalog_object',
      label: gettext('Catalog Object'),
      hasSQL:  false,
      hasScriptTypes: [],
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

      },
      getSchema: ()=>new CatalogObjectSchema(),
      /* Few fields are kept since the properties tab for collection is not
      yet migrated to new react schema. Once the properties for collection
      is removed, remove this model */
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          namespaceowner: undefined,
          nspacl: undefined,
          description: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', readonly: true,
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text',
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', readonly: true,
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline' ,  readonly: true,
        },
        ],
      }),

    });

  }

  return pgBrowser.Nodes['catalog_object'];
});
