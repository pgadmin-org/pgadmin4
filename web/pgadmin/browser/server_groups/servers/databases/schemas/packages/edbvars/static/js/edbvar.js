/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import EDBVarSchema from './edbvar.ui';

/* Create and Register Function Collection and Node. */
define('pgadmin.node.edbvar', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-edbvar']) {
    pgBrowser.Nodes['coll-edbvar'] =
      pgBrowser.Collection.extend({
        node: 'edbvar',
        label: gettext('Variables'),
        type: 'coll-edbvar',
        columns: ['name', 'funcowner', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['edbvar']) {
    pgBrowser.Nodes['edbvar'] = pgBrowser.Node.extend({
      type: 'edbvar',
      dialogHelp: url_for('help.static', {'filename': 'edbvar_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-edbvar',
      canEdit: false,
      hasSQL: true,
      hasScriptTypes: [],
      parent_type: ['package'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

      },
      canDrop: false,
      canDropCascade: false,
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        }]
      }),
      getSchema: () => {
        return new EDBVarSchema();
      }
    });

  }

  return pgBrowser.Nodes['edbvar'];
});
