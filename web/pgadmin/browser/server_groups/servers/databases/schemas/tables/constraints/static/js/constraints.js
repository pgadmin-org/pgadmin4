/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.constraints', [
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
  'pgadmin.node.unique_constraint', 'pgadmin.node.check_constraint',
  'pgadmin.node.foreign_key', 'pgadmin.node.exclusion_constraint',
  'pgadmin.node.primary_key',
], function(gettext, $, _, pgAdmin, pgBrowser) {

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
      collection_type: 'coll-constraints',
      parent_type: ['table','partition'],
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([]);
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          comment: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('Oid'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
        }],
      }),
    });
  }

  return pgBrowser.Nodes['constraints'];
});
