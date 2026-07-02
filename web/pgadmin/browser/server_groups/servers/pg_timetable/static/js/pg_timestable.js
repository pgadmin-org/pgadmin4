define([
  'sources/pgadmin',
  'sources/gettext',
  'sources/browser/node',
  './pg_timetable_schema.ui' // Imports the React UI Schema file we defined earlier
], function(pgAdmin, gettext, Node, PGTimetableChainSchema) {

  // 1. Prevent duplicate registrations if pgAdmin reloads the scripts
  if (pgAdmin.Browser.Nodes['pg_timetable_chain']) {
    return pgAdmin.Browser.Nodes['pg_timetable_chain'];
  }

  // 2. Define the main browser node mirroring native pgAgent structures
  var pgTimetableChainNode = pgAdmin.Browser.Nodes['pg_timetable_chain'] = Node.extend({
    type: 'pg_timetable_chain',
    label: gettext('pg_timetable Chain'),
    hasId: true,
    parent_type: 'server',
    canDrop: true, // Enables the "Delete/Drop" menu item

    // Configures context and upper tools menu layouts
    menus: [{
      name: 'create_pg_timetable_chain',
      module: this,
      applies: ['tools', 'context'],
      callback: 'show_obj_properties',
      category: 'create',
      priority: 4,
      label: gettext('pg_timetable Chain...'),
      icon: 'fa fa-plus',
      enable: 'canCreate'
    }],

    // 3. Dynamic icon evaluator tied directly to our custom CSS classes
    icon: function(node_data) {
      if (node_data && node_data.live === false) {
        return 'icon-pg_timetable_chain-disabled';
      }
      return 'icon-pg_timetable_chain';
    },

    // 4. Verification checking if a server connection is open before enabling menus
    canCreate: function(node) {
      return node && node.connected;
    },

    // 5. Connects the UI to our React schema for building Create/Edit dialog forms
    getSchema: function(treeInfo, itemData) {
      return new PGTimetableChainSchema.default({
        role: treeInfo.server.user,
        server_info: treeInfo.server
      });
    }
  });

  return pgTimetableChainNode;
});
// Inside your web/pgadmin/browser/server_groups/servers/pg_timetable/static/js/pg_timetable.js node extension

