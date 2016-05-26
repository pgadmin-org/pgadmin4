define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

    // Extend the browser's node model class to create a Options model
    var OptionsModel = pgAdmin.Browser.Node.Model.extend({
        defaults: {
          umoption: undefined,
          umvalue: undefined
        },

        // Defining schema for the Options model
        schema: [
          {id: 'umoption', label:'Options', type:'text', cellHeaderClasses:'width_percent_50', group: null, editable: true},
          {id: 'umvalue', label:'Value', type: 'text', cellHeaderClasses:'width_percent_50', group:null, editable: true},
        ],

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the browser for the respective control.
         */
        validate: function() {
          // Validation for the option value
          if (_.isUndefined(this.get('umoption')) ||
            _.isNull(this.get('umoption')) ||
            String(this.get('umoption')).replace(/^\s+|\s+$/g, '') == '') {
            var msg = 'Please enter an option name';
            this.errorModel.set('umoption', msg);
            return msg;
          } else {
            this.errorModel.unset('umoption');
          }
          return null;
        }
    });

  // Extend the browser's collection class for user mapping collection
  if (!pgBrowser.Nodes['coll-user_mapping']) {
    var foreign_data_wrappers = pgAdmin.Browser.Nodes['coll-user_mapping'] =
      pgAdmin.Browser.Collection.extend({
        node: 'user_mapping',
        label: '{{ _('User Mappings') }}',
        type: 'coll-user_mapping',
        columns: ['name']
      });
  };

  // Extend the browser's node class for user mapping node
  if (!pgBrowser.Nodes['user_mapping']) {
    pgAdmin.Browser.Nodes['user_mapping'] = pgAdmin.Browser.Node.extend({
      parent_type: 'foreign_server',
      type: 'user_mapping',
      sqlAlterHelp: 'sql-alterusermapping.html',
      sqlCreateHelp: 'sql-createusermapping.html',
      dialogHelp: '{{ url_for('help.static', filename='user_mapping_dialog.html') }}',
      label: '{{ _('User Mapping') }}',
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
         * user mapping collections and user mapping node
         */
        pgBrowser.add_menus([{
          name: 'create_user_mapping_on_coll', node: 'coll-user_mapping', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('User Mapping...') }}',
          icon: 'wcTabIcon icon-user_mapping', data: {action: 'create'}
        },{
          name: 'create_user_mapping', node: 'user_mapping', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('User Mapping...') }}',
          icon: 'wcTabIcon icon-user_mapping', data: {action: 'create'}
        },{
          name: 'create_user_mapping', node: 'foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('User Mapping...') }}',
          icon: 'wcTabIcon icon-user_mapping', data: {action: 'create'}
        }
        ]);
      },

      // Defining model for user mapping node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          um_options: []
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'name': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Defining schema for the user mapping node
        schema: [{
          id: 'name', label:'{{ _('User') }}', type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'create', 'properties'], select2: { allowClear: false },
          disabled: function(m) { return !m.isNew(); },
          transform: function(data) {
            var self = this;
            node = self.field.get('schema_node');
            var res =
            Backform.NodeListByNameControl.prototype.defaults.transform.apply(
              this, arguments
            );
            res.unshift({label: 'CURRENT_USER', value: 'CURRENT_USER', image: 'icon-' + node.type},
                        {label: 'PUBLIC', value: 'PUBLIC', image: 'icon-' + node.type});
            return res;
         }
        },{
          id: 'um_oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text', disabled: true, mode: ['properties'],
        },{
          id: 'umoptions', label: 'Options', type: 'collection', group: "Options",
          model: OptionsModel, control: 'unique-col-collection', mode: ['create', 'edit'],
          canAdd: true, canDelete: true, uniqueCol : ['umoption']
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

  return pgBrowser.Nodes['coll-user_mapping'];
});
