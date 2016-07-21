define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's collection class for event trigger collection
  if (!pgBrowser.Nodes['coll-event_trigger']) {
    var databases = pgAdmin.Browser.Nodes['coll-event_trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'event_trigger',
        label: '{{ _('Event Trigger') }}',
        type: 'coll-event_trigger',
        columns: ['name', 'eventowner', 'comment']
      });
  };

  // Extend the browser's node class for event triggers node
  if (!pgBrowser.Nodes['event_trigger']) {
    pgAdmin.Browser.Nodes['event_trigger'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'event_trigger',
      sqlAlterHelp: 'sql-altereventtrigger.html',
      sqlCreateHelp: 'sql-createeventtrigger.html',
      dialogHelp: '{{ url_for('help.static', filename='event_trigger_dialog.html') }}',
      label: '{{ _('Event Trigger') }}',
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
          category: 'create', priority: 4, label: '{{ _('Event Trigger...') }}',
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'}
        },{
          name: 'create_event_trigger', node: 'event_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Event Trigger...') }}',
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'}
        },{
          name: 'create_event_trigger', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Event Trigger...') }}',
          icon: 'wcTabIcon icon-event_trigger', data: {action: 'create'}
        }
        ]);
      },
      // Define the model for event trigger node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          oid: undefined,
          name: undefined,
          eventowner: undefined,
          comment: undefined,
          enabled: undefined,
          eventfuncoid: undefined,
          eventfunname: undefined,
          eventname: undefined,
          when: undefined,
          xmin: undefined,
          source: undefined,
          language: undefined
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
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', mode: ['properties']
        },{
          id: 'eventowner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl
        },{
          id: 'comment', label:'{{ _('Comment') }}', type: 'multiline'
        },{
          id: 'enabled', label:'{{ _('Enabled status') }}',
          type:"radio", group: "Definition", mode: ['properties', 'edit','create'],
          options: [
            {label: "Enable", value: "O"},
            {label: "Disable", value: "D"},
            {label: "Replica", value: "R"},
            {label: "Always", value: "A"}
          ]
        },{
          id: 'eventfunname', label:'{{ _('Trigger function') }}',
          type: 'text', control: 'node-ajax-options', group: "Definition",
          url:'fopts'
        },{
          id: 'eventname', label:'{{ _('Events') }}',
          type:"radio", group: "Definition", cell: 'string',
          options: [
            {label: "DDL COMMAND START", value: "DDL_COMMAND_START"},
            {label: "DDL COMMAND END", value: "DDL_COMMAND_END"},
            {label: "SQL DROP", value: "SQL_DROP"}
          ]
        },{
          id: 'when', label:'{{ _('When') }}', type: 'multiline', group: "Definition",
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: pgBrowser.SecLabelModel, editable: false, type: 'collection',
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          min_version: 90200, canAdd: true,
          canEdit: false, canDelete: true, control: 'unique-col-collection'
         }
        ],
        // event trigger model data validation.
        validate: function() {
          var msg = undefined;
          // Clear any existing error msg.
          this.errorModel.clear();

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Event trigger name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventowner'))
              || String(this.get('eventowner')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Event trigger owner cannot be empty.') }}';
            this.errorModel.set('eventowner', msg);
            return msg;
          }

          if (_.isUndefined(this.get('enabled'))) {
            msg = '{{ _('Event trigger enabled status cannot be empty.') }}';
            this.errorModel.set('enabled', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventfunname'))
              || String(this.get('eventfunname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Event trigger function cannot be empty.') }}';
            this.errorModel.set('eventfunname', msg);
            return msg;
          }

          if (_.isUndefined(this.get('eventname'))) {
            msg = '{{ _('Event trigger event cannot be empty.') }}';
            this.errorModel.set('eventname', msg);
            return msg;
          }

          return null;
        }
      })
  });

  }

  return pgBrowser.Nodes['coll-event_trigger'];
});
