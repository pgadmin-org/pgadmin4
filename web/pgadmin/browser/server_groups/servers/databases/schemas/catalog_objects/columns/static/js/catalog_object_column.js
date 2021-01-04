/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.catalog_object_column', [
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, $, _, pgAdmin, pgBrowser) {

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
        model: pgAdmin.Browser.Node.Model.extend({
          defaults: {
            attname: undefined,
            attowner: undefined,
            atttypid: undefined,
            attnum: undefined,
            cltype: undefined,
            collspcname: undefined,
            attacl: undefined,
            is_sys_obj: undefined,
            description: undefined,
          },
          schema: [{
            id: 'attname', label: gettext('Column'), cell: 'string',
            type: 'text', readonly: true,
          },{
            id: 'attowner', label: gettext('Owner'), cell: 'string',
            type: 'text', readonly: true,
          },{
            id: 'attnum', label: gettext('Position'), cell: 'string',
            type: 'text', readonly: true,
          },{
            id: 'cltype', label: gettext('Data type'), cell: 'string',
            group: gettext('Definition'), type: 'text', readonly: true,
          },{
            id: 'collspcname', label: gettext('Collation'), cell: 'string',
            group: gettext('Definition'), type: 'text', readonly: true,
          },{
            id: 'attacl', label: gettext('Privileges'), cell: 'string',
            group: gettext('Security'), type: 'text', readonly: true,
          },{
            id: 'is_sys_obj', label: gettext('System column?'),
            cell:'boolean', type: 'switch', mode: ['properties'],
          },{
            id: 'description', label: gettext('Comment'), cell: 'string',
            type: 'multiline', readonly: true,
          }],
        }),
      });
  }

  return pgBrowser.Nodes['catalog_object_column'];
});
