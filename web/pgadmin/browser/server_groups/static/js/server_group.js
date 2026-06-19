/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ServerGroupSchema from './server_group.ui';

define('pgadmin.node.server_group', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.node',
], function(gettext, url_for, pgAdmin) {

  if (!pgAdmin.Browser.Nodes['server_group']) {
    pgAdmin.Browser.Nodes['server_group'] = pgAdmin.Browser.Node.extend({
      parent_type: null,
      type: 'server_group',
      dialogHelp: url_for('help.static', {'filename': 'server_group_dialog.html'}),
      label: gettext('Server Group'),
      width: '250px',
      height: '150px',
      is_collection: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'create_server_group', node: 'server_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Server Group...'),
          data: {'action': 'create'},
          shortcut_preference: ['browser', 'sub_menu_create'],
        }]);
      },
      getSchema: ()=>new ServerGroupSchema(),
      canEdit: function(itemData) {
        return (itemData && itemData.can_edit);
      },
      canDrop: function(itemData) {
        return (itemData && itemData.can_delete);
      },
      dropAsRemove: true,

    });
  }

  return pgAdmin.Browser.Nodes['server_group'];
});
