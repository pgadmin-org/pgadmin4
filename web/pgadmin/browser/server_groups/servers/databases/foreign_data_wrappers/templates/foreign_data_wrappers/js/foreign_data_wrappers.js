define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
        'alertify', 'pgadmin.browser.collection',
        'pgadmin.browser.server.privilege'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

    // Extend the browser's node model class to create a Options model
    var OptionsModel = pgBrowser.Node.Model.extend({
        defaults: {
          fdwoption: undefined,
          fdwvalue: undefined
        },
        // Defining schema for the Options model
        schema: [{
          id: 'fdwoption', label: '{{ _('Option') }}', type:'text',
          cellHeaderClasses:'width_percent_50', editable: true
        },{
          id: 'fdwvalue', label:'{{ _('Value') }}', type: 'text',
          cellHeaderClasses:'width_percent_50', group:null, editable: true
        }],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the browser for the respective control.
         */
        validate: function() {
          // Validation for the option name
          if (_.isUndefined(this.get('fdwoption')) ||
            _.isNull(this.get('fdwoption')) ||
            String(this.get('fdwoption')).replace(/^\s+|\s+$/g, '') == '') {
            var msg = 'Please enter an option name';
            this.errorModel.set('fdwoption', msg);
            return msg;
          } else {
            this.errorModel.unset('fdwoption');
          }
          return null;
        }
    });

  // Extend the browser's collection class for foreign data wrapper collection
  if (!pgBrowser.Nodes['coll-foreign_data_wrapper']) {
    var foreign_data_wrappers = pgBrowser.Nodes['coll-foreign_data_wrapper'] =
      pgBrowser.Collection.extend({
        node: 'foreign_data_wrapper',
        label: '{{ _('Foreign Data Wrappers') }}',
        type: 'coll-foreign_data_wrapper',
        columns: ['name','fdwowner','description']
      });
  };

  // Extend the browser's node class for foreign data wrapper node
  if (!pgBrowser.Nodes['foreign_data_wrapper']) {
    pgBrowser.Nodes['foreign_data_wrapper'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'foreign_data_wrapper',
      sqlAlterHelp: 'sql-alterforeigndatawrapper.html',
      sqlCreateHelp: 'sql-createforeigndatawrapper.html',
      dialogHelp: '{{ url_for('help.static', filename='foreign_data_wrapper_dialog.html') }}',
      label: '{{ _('Foreign Data Wrapper') }}',
      hasSQL:  true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
            return;

        this.initialized = true;

        /* Create foreign data wrapper context menu at database,
         * foreign data wrapper collections and foreign data wrapper node
         */
        pgBrowser.add_menus([{
          name: 'create_foreign_data_wrapper_on_coll', node: 'coll-foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Data Wrapper...') }}',
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'}
        },{
          name: 'create_foreign_data_wrapper', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Data Wrapper...') }}',
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'}
        },{
          name: 'create_foreign_data_wrapper', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Data Wrapper...') }}',
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'}
        }
        ]);
      },

      // Defining model for foreign data wrapper node
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          fdwowner: undefined,
          comment: undefined,
          fdwvalue: undefined,
          fdwhan: undefined,
          fdwoption: undefined,
          fdwacl: []
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'fdwowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Defining schema for the foreign data wrapper node
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: function(m) {

            // name field will be disabled only if edit mode and server version is below 9.2
            if (this.mode == 'edit' && this.node_info.server.version < 90200) {
              return true;
            }
            else
              return false;
          }
        },{
          id: 'fdwoid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', disabled: true, mode: ['properties']
        },{
          id: 'fdwowner', label:'{{ _('Owner') }}', type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'create', 'properties'], select2: { allowClear: false }
        },{
          id: 'fdwhan', label:'{{ _('Handler') }}', type: 'text', control: 'node-ajax-options',
          group: '{{ _('Definition') }}', mode: ['edit', 'create', 'properties'], url:'get_handlers'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'fdwoptions', label: 'Options', type: 'collection', group: '{{ _('Options') }}',
          model: OptionsModel, control: 'unique-col-collection', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, uniqueCol : ['fdwoption'],
          columns: ['fdwoption','fdwvalue']
        },{
          id: 'fdwvalue', label:'{{ _('Validator') }}', type: 'text', control: 'node-ajax-options',
          group: '{{ _('Definition') }}', mode: ['edit', 'create', 'properties'], url:'get_validators'
        },{
          id: 'security', label: '{{ _("Security")  }}', type: 'group'
        },{
            id: 'fdwacl', label: 'Privileges', type: 'collection',
            group: 'security', mode: ['edit', 'create'], canAdd: true,
            canDelete: true, uniqueCol : ['grantee'],
            model: pgBrowser.Node.PrivilegeRoleModel.extend({
              privileges: ['U']
            }), control: 'unique-col-collection'
         },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
         }],
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

  return pgBrowser.Nodes['foreign_data_wrapper'];
});
