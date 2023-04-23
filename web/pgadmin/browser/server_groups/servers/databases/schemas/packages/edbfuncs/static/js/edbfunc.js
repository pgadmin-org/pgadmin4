/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import EDBFuncSchema from './edbfunc.ui';

/* Create and Register Function Collection and Node. */
define('pgadmin.node.edbfunc', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  if (!pgBrowser.Nodes['coll-edbfunc']) {
    pgBrowser.Nodes['coll-edbfunc'] =
      pgBrowser.Collection.extend({
        node: 'edbfunc',
        label: gettext('Functions'),
        type: 'coll-edbfunc',
        columns: ['name', 'funcowner', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['edbfunc']) {
    pgBrowser.Nodes['edbfunc'] = pgBrowser.Node.extend({
      type: 'edbfunc',
      dialogHelp: url_for('help.static', {'filename': 'edbfunc_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-edbfunc',
      hasDepends: true,
      canEdit: false,
      hasSQL: true,
      hasScriptTypes: [],
      parent_type: ['package'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

      },
      canDrop: false,
      canDropCascade: false,
      getSchema: () => {
        return new EDBFuncSchema(
          {}, {
            name: 'sysfunc'
          }
        );
      }
    });

  }

  return pgBrowser.Nodes['edbfunc'];
});
