/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.event_trigger', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

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
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'},
        },{
          name: 'create_event_trigger', node: 'event_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Event Trigger...'),
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'},
        },{
          name: 'create_event_trigger', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Event Trigger...'),
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },
        ]);
      },
      // Define the model for event trigger node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          oid: undefined,
          name: undefined,
          eventowner: undefined,
          is_sys_obj: undefined,
          comment: undefined,
          enabled: 'O',
          eventfuncoid: undefined,
          eventfunname: undefined,
          eventname: 'DDL_COMMAND_START',
          when: undefined,
          xmin: undefined,
          source: undefined,
          language: undefined,
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'eventowner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the event trigger node
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'eventowner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl,
        },{
          id: 'is_sys_obj', label: gettext('System event trigger?'),
          cell:'boolean', type: 'switch',
          mode: ['properties'],
        },{
          id: 'comment', label: gettext('Comment'), type: 'multiline',
        },{
          id: 'enabled', label: gettext('Trigger enabled?'),
          group: gettext('Definition'), mode: ['properties', 'edit','create'],
          options: [
            {label: gettext('Enable'), value: 'O'},
            {label: gettext('Disable'), value: 'D'},
            {label: gettext('Replica'), value: 'R'},
            {label: gettext('Always'), value: 'A'},
          ],
          control: 'select2', select2: { allowClear: false, width: '100%' },
        },{
          id: 'eventfunname', label: gettext('Trigger function'),
          type: 'text', control: 'node-ajax-options', group: gettext('Definition'),
          url:'fopts', cache_node: 'trigger_function',
        },{
          id: 'eventname', label: gettext('Event'),
          group: gettext('Definition'), cell: 'string',
          options: [
            {label: gettext('DDL COMMAND START'), value: 'DDL_COMMAND_START'},
            {label: gettext('DDL COMMAND END'), value: 'DDL_COMMAND_END'},
            {label: gettext('SQL DROP'), value: 'SQL_DROP'},
          ],
          control: 'select2', select2: { allowClear: false, width: '100%' },
        },{
          id: 'when', label: gettext('When TAG in'),  cell: 'string',
          type: 'text', group: gettext('Definition'),
          control: Backform.SqlFieldControl,
          extraClasses:['custom_height_css_class'],
        },{
          id: 'seclabels', label: gettext('Security labels'),
          model: pgBrowser.SecLabelModel, editable: false, type: 'collection',
          group: gettext('Security'), mode: ['edit', 'create'],
          min_version: 90200, canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection',
        },
        ],
        // event trigger model data validation.
        validate: function() {
          var msg = undefined;
          // Clear any existing error msg.
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Event trigger name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventowner'))
              || String(this.get('eventowner')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Event trigger owner cannot be empty.');
            this.errorModel.set('eventowner', msg);
            return msg;
          }

          if (_.isUndefined(this.get('enabled'))) {
            msg = gettext('Event trigger enabled status cannot be empty.');
            this.errorModel.set('enabled', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventfunname'))
              || String(this.get('eventfunname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Event trigger function cannot be empty.');
            this.errorModel.set('eventfunname', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventname'))) {
            msg = gettext('Event trigger event cannot be empty.');
            this.errorModel.set('eventname', msg);
            return msg;
          }

          return null;
        },
      }),
    });

  }

  return pgBrowser.Nodes['coll-event_trigger'];
});
