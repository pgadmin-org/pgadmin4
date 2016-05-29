define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection',
        'pgadmin.browser.server.privilege'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's node model class to create a Options model
  var OptionsModel = pgAdmin.Browser.Node.Model.extend({
        defaults: {
          fsrvoption: undefined,
          fsrvvalue: undefined
        },

        // Defining schema for the Options model
        schema: [
          {id: 'fsrvoption', label:'Options', type:'text', cellHeaderClasses:'width_percent_50', group: null, editable: true},
          {id: 'fsrvvalue', label:'Value', type: 'text', cellHeaderClasses:'width_percent_50', group:null, editable: true},
        ],

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the browser for the respective control.
         */
        validate: function() {
          // Validation for the option name
          if (_.isUndefined(this.get('fsrvoption')) ||
            _.isNull(this.get('fsrvoption')) ||
            String(this.get('fsrvoption')).replace(/^\s+|\s+$/g, '') == '') {
            var msg = 'Please enter an option name';
            this.errorModel.set('fsrvoption', msg);
            return msg;
          } else {
            this.errorModel.unset('fsrvoption');
          }
          return null;
        }
    });

  // Extend the browser's collection class for foreign server collection
  if (!pgBrowser.Nodes['coll-foreign_server']) {
    var foreign_data_wrappers = pgAdmin.Browser.Nodes['coll-foreign_server'] =
      pgAdmin.Browser.Collection.extend({
        node: 'foreign_server',
        label: '{{ _('Foreign Servers') }}',
        type: 'coll-foreign_server',
        columns: ['name','fsrvowner','description']
      });
  };

  // Extend the browser's node class for foreign server node
  if (!pgBrowser.Nodes['foreign_server']) {
    pgAdmin.Browser.Nodes['foreign_server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'foreign_data_wrapper',
      type: 'foreign_server',
      sqlAlterHelp: 'sql-alterforeignserver.html',
      sqlCreateHelp: 'sql-createforeignserver.html',
      label: '{{ _('Foreign Server') }}',
      hasSQL:  true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
            return;

        this.initialized = true;

        /* Create foreign server context menu at database,
         * foreign server collections and foreign server node
         */
        pgBrowser.add_menus([{
          name: 'create_foreign_server_on_coll', node: 'coll-foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Server...') }}',
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'}
        },{
          name: 'create_foreign_server', node: 'foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Server...') }}',
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'}
        },{
          name: 'create_foreign_server', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Server...') }}',
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'}
        }
        ]);
      },

      // Defining model for foreign server node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          fsrvtype: undefined,
          fsrvversion: undefined,
          fsrvvalue: undefined,
          fsrvoptions: [],
          fsrvowner: undefined,
          description: undefined,
          fsrvacl: []
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'fsrvowner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Defining schema for the foreign server node
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: function(m) {
            if (this.mode == 'edit' && this.node_info.server.version < 90200) {
              return true;
            }
            else
              return false;
          }
        },{
          id: 'fsrvid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', disabled: true, mode: ['properties']
        },{
          id: 'fsrvowner', label:'{{ _('Owner') }}', type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'create', 'properties'], select2: { allowClear: false }
        },{
          id: 'fsrvtype', label:'{{ _('Type') }}', cell: 'string',
          group: '{{ _('Definition') }}', type: 'text', mode: ['edit','create','properties'], disabled: function(m) {
            return !m.isNew();
          }
        },{
          id: 'fsrvversion', label:'{{ _('Version') }}', cell: 'string',
          group: '{{ _('Definition') }}', type: 'text'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'fsrvoptions', label: 'Options', type: 'collection', group: "Options",
          model: OptionsModel, control: 'unique-col-collection', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, uniqueCol : ['fsrvoption'],
          columns: ['fsrvoption','fsrvvalue']
         }, pgBrowser.SecurityGroupUnderSchema, {
            id: 'fsrvacl', label: 'Privileges', type: 'collection', group: 'security',
            model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend({privileges: ['U']}), control: 'unique-col-collection',
            mode: ['edit', 'create'], canAdd: true, canDelete: true, uniqueCol : ['grantee']
         },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
         }
        ],

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the browser for the respective control.
         */
        validate: function() {
          var name = this.get('name');

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        }
      })
  });

  }

  return pgBrowser.Nodes['coll-foreign_server'];
});
