/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import AggregateSchema from './aggregate.ui';

define('pgadmin.node.aggregate', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, schemaChild) {

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
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'owner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: gettext('Aggregate'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          control: 'node-list-by-name',
          node: 'role',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
        }
        ],
      }),
      getSchema: ()=>{
        let schema = new AggregateSchema();
        return schema;
      }
    });
  }
  return pgBrowser.Nodes['aggregate'];
});
