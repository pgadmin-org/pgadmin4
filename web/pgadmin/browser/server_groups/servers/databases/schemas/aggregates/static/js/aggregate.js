/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import AggregateSchema from './aggregate.ui';

define('pgadmin.node.aggregate', [
  'sources/gettext', 'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
], function(gettext, pgAdmin, pgBrowser, schemaChild) {

  if (!pgBrowser.Nodes['coll-aggregate']) {
    pgAdmin.Browser.Nodes['coll-aggregate'] =
      pgAdmin.Browser.Collection.extend({
        node: 'aggregate',
        label: gettext('Aggregates'),
        type: 'coll-aggregate',
        columns: ['name', 'owner', 'description'],
        canDrop: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['aggregate']) {
    pgAdmin.Browser.Nodes['aggregate'] = schemaChild.SchemaChildNode.extend({
      type: 'aggregate',
      sqlAlterHelp: 'sql-alteraggregate.html',
      sqlCreateHelp: 'sql-createaggregate.html',
      label: gettext('Aggregate'),
      collection_type: 'coll-aggregate',
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
        return new AggregateSchema();
      }
    });
  }
  return pgBrowser.Nodes['aggregate'];
});
