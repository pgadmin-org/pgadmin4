/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.foreign_server', [
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.backform', 'pgadmin.browser.collection',
  'pgadmin.browser.server.privilege',
], function(gettext, $, _, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's node model class to create a Options model
  var OptionsModel = pgAdmin.Browser.Node.Model.extend({
    idAttribute: 'fsrvoption',
    defaults: {
      fsrvoption: undefined,
      fsrvvalue: undefined,
    },

    // Defining schema for the Options model
    schema: [
      {id: 'fsrvoption', label: gettext('Options'), type:'text', cellHeaderClasses:'width_percent_50', group: null, editable: true},
      {id: 'fsrvvalue', label: gettext('Value'), type: 'text', cellHeaderClasses:'width_percent_50', group:null, editable: true},
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
        var msg = gettext('Please enter an option name.');
        this.errorModel.set('fsrvoption', msg);
        return msg;
      } else {
        this.errorModel.unset('fsrvoption');
      }
      return null;
    },
  });

  // Extend the browser's collection class for foreign server collection
  if (!pgBrowser.Nodes['coll-foreign_server']) {
    pgAdmin.Browser.Nodes['coll-foreign_server'] =
      pgAdmin.Browser.Collection.extend({
        node: 'foreign_server',
        label: gettext('Foreign Servers'),
        type: 'coll-foreign_server',
        columns: ['name','fsrvowner','description'],
      });
  }

  // Extend the browser's node class for foreign server node
  if (!pgBrowser.Nodes['foreign_server']) {
    pgAdmin.Browser.Nodes['foreign_server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'foreign_data_wrapper',
      type: 'foreign_server',
      sqlAlterHelp: 'sql-alterforeignserver.html',
      sqlCreateHelp: 'sql-createforeignserver.html',
      label: gettext('Foreign Server'),
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
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
        },
        ]);
      },

      // Defining model for foreign server node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          fsrvtype: undefined,
          fsrvversion: undefined,
          fsrvvalue: undefined,
          fsrvoptions: [],
          fsrvowner: undefined,
          is_sys_obj: undefined,
          description: undefined,
          fsrvacl: [],
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
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: function() {
            return (
              this.mode == 'edit' && this.node_info.server.version < 90200
            );
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'fsrvowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'create', 'properties'], select2: { allowClear: false },
        },{
          id: 'fsrvtype', label: gettext('Type'), cell: 'string',
          group: gettext('Definition'), type: 'text', mode: ['edit','create','properties'], disabled: function(m) {
            return !m.isNew();
          },
        },{
          id: 'fsrvversion', label: gettext('Version'), cell: 'string',
          group: gettext('Definition'), type: 'text',
        },{
          id: 'is_sys_obj', label: gettext('System foreign server?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },{
          id: 'fsrvoptions', label: gettext('Options'), type: 'collection', group: gettext('Options'),
          model: OptionsModel, control: 'unique-col-collection', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, uniqueCol : ['fsrvoption'],
          columns: ['fsrvoption','fsrvvalue'],
        }, pgBrowser.SecurityGroupSchema, {
          id: 'fsrvacl', label: gettext('Privileges'), type: 'collection', group: 'security',
          model: pgAdmin.Browser.Node.PrivilegeRoleModel.extend({privileges: ['U']}), control: 'unique-col-collection',
          mode: ['edit', 'create'], canAdd: true, canDelete: true, uniqueCol : ['grantee'],
        },{
          id: 'acl', label: gettext('Privileges'), type: 'text',
          group: gettext('Security'), mode: ['properties'],
        },
        ],

        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the browser for the respective control.
         */
        validate: function() {
          var name = this.get('name');

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        },
      }),
    });

  }

  return pgBrowser.Nodes['coll-foreign_server'];
});
