/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';

define([
  'sources/gettext', 'sources/pgadmin',
  'sources/browser/generate_url',
  'pgadmin.browser.node',
], function(gettext, pgAdmin, generateUrl) {

  let pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Collection)
    return pgBrowser.Collection;

  pgBrowser.Collection = function() {/*This is intentional (SonarQube)*/};

  _.extend(
    pgBrowser.Collection,
    _.clone(pgBrowser.Node), {
      ///////
      // Initialization function
      // Generally - used to register the menus for this type of node.
      //
      // Also, look at pgAdmin.Browser.add_menus(...) function.
      //
      // Collection will not have 'Properties' menu.
      //
      // NOTE: Override this for each node for initialization purpose
      Init: function() {
        if (this.node_initialized)
          return;
        this.node_initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'refresh', node: this.type, module: this,
          applies: ['object', 'context'], callback: 'refresh',
          priority: 2, label: gettext('Refresh'),
        }]);

        // show query tool only in context menu of supported nodes.
        if (pgAdmin.unsupported_nodes && _.indexOf(pgAdmin.unsupported_nodes, this.type) == -1) {
          if ((this.type == 'database' && this.allowConn) || this.type != 'database') {
            pgAdmin.Browser.add_menus([{
              name: 'show_query_tool', node: this.type, module: this,
              applies: ['context'], callback: 'show_query_tool',
              priority: 998, label: gettext('Query Tool'),
            }]);

            // show search objects same as query tool
            pgAdmin.Browser.add_menus([{
              name: 'search_objects', node: this.type, module: this,
              applies: ['context'], callback: 'show_search_objects',
              priority: 997, label: gettext('Search Objects...'),
            }]);

            // show psql tool same as query tool.
            if(pgAdmin['enable_psql']) {
              pgAdmin.Browser.add_menus([{
                name: 'show_psql_tool', node: this.type, module: this,
                applies: ['context'], callback: 'show_psql_tool',
                priority: 998, label: gettext('PSQL Tool'),
              }]);
            }
          }
        }
      },

      hasId: false,
      is_collection: true,
      collection_node: true,
      // A collection will always have a collection of statistics, when the node
      // it represent will have some statistics.
      hasCollectiveStatistics: true,
      canDrop: true,
      canDropCascade: true,
      selectParentNodeOnDelete: false,
      generate_url: function(item, type) {
        /*
         * Using list, and collection functions of a node to get the nodes
         * under the collection, and properties of the collection respectively.
         */
        let opURL = {
            'properties': 'obj',
            'children': 'nodes',
            'drop': 'obj',
          },
          self = this;
        let collectionPickFunction = function (treeInfoValue, treeInfoKey) {
          return (treeInfoKey != self.type);
        };
        let treeInfo = pgBrowser.tree.getTreeNodeHierarchy(item);
        let actionType = type in opURL ? opURL[type] : type;
        return generateUrl.generate_url(
          pgAdmin.Browser.URL, treeInfo, actionType, self.node,
          collectionPickFunction
        );
      },
      show_query_tool: function() {
        if(pgAdmin.Tools.SQLEditor) {
          pgAdmin.Tools.SQLEditor.showQueryTool('', pgAdmin.Browser.tree.selected());
        }
      },
      show_search_objects: function() {
        if(pgAdmin.Tools.SearchObjects) {
          pgAdmin.Tools.SearchObjects.show_search_objects('', pgAdmin.Browser.tree.selected());
        }
      },
      show_psql_tool: function(args) {
        let input = args || {},
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i ? t.itemData(i) : undefined;
        pgBrowser.psql.psql_tool(d, i, true);
      },
    });

  return pgBrowser.Collection;
});
