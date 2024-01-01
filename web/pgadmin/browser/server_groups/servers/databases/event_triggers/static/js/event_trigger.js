/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import EventTriggerSchema from './event_trigger.ui';
import { getNodeListByName, getNodeAjaxOptions } from '../../../../../../static/js/node_ajax';

define('pgadmin.node.event_trigger', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  // Extend the browser's collection class for event trigger collection
  if (!pgBrowser.Nodes['coll-event_trigger']) {
    pgAdmin.Browser.Nodes['coll-event_trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'event_trigger',
        label: gettext('Event Trigger'),
        type: 'coll-event_trigger',
        columns: ['name', 'eventowner', 'comment'],
        canDrop: true,
        canDropCascade: false,
      });
  }

  // Extend the browser's node class for event triggers node
  if (!pgBrowser.Nodes['event_trigger']) {
    pgAdmin.Browser.Nodes['event_trigger'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'event_trigger',
      sqlAlterHelp: 'sql-altereventtrigger.html',
      sqlCreateHelp: 'sql-createeventtrigger.html',
      dialogHelp: url_for('help.static', {'filename': 'event_trigger_dialog.html'}),
      label: gettext('Event Trigger'),
      hasSQL:  true,
      hasDepends: true,
      canDrop: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_event_trigger_on_coll', node: 'coll-event_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Event Trigger...'),
          data: {action: 'create'},
        },{
          name: 'create_event_trigger', node: 'event_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Event Trigger...'),
          data: {action: 'create'},
        },{
          name: 'create_event_trigger', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Event Trigger...'),
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new EventTriggerSchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            function_names: ()=>getNodeAjaxOptions('fopts', this, treeNodeInfo, itemNodeData, {
              cacheLevel: 'trigger_function',
            }),
          },
          {
            eventowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['coll-event_trigger'];
});
