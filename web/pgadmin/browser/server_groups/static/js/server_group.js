/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ServerGroupSchema from './server_group.ui';
import _ from 'lodash';

define('pgadmin.node.server_group', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.user_management.current_user', 'pgadmin.browser', 'pgadmin.browser.node',
], function(gettext, url_for, pgAdmin, current_user) {

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
        }]);
      },
      getSchema: ()=>new ServerGroupSchema(),
      canDrop: function(itemData) {
        let serverOwner = itemData.user_id;
        return !(serverOwner != current_user.id && !_.isUndefined(serverOwner));
      },
      dropAsRemove: true,
      canDelete: function(i) {
        let s = pgAdmin.Browser.tree.siblings(i, true);

        /* This is the only server group - we can't remove it*/
        return !(!s || s.length == 0);
      },
    });
  }

  return pgAdmin.Browser.Nodes['server_group'];
});
