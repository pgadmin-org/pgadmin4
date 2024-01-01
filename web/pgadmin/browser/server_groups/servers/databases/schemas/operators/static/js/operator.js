/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import OperatorSchema from './operator.ui';

define('pgadmin.node.operator', [
  'sources/gettext',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
], function(gettext, pgAdmin, pgBrowser, schemaChild) {

  if (!pgBrowser.Nodes['coll-operator']) {
    pgAdmin.Browser.Nodes['coll-operator'] =
      pgAdmin.Browser.Collection.extend({
        node: 'operator',
        label: gettext('Operators'),
        type: 'coll-operator',
        columns: ['name', 'owner', 'description'],
        canDrop: false,
        canDropCascade: false,
        canSelect: false
      });
  }

  if (!pgBrowser.Nodes['operator']) {
    pgAdmin.Browser.Nodes['operator'] = schemaChild.SchemaChildNode.extend({
      type: 'operator',
      sqlAlterHelp: 'sql-alteroperator.html',
      sqlCreateHelp: 'sql-createoperator.html',
      label: gettext('Operator'),
      collection_type: 'coll-operator',
      hasSQL: true,
      hasDepends: false,
      canDrop: false,
      canDropCascade: false,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;
      },
      getSchema: ()=>{
        return new OperatorSchema();
      }
    });
  }
  return pgBrowser.Nodes['operator'];
});
