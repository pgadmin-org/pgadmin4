/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.language', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's collection class for languages collection
  if (!pgBrowser.Nodes['coll-language']) {
    pgBrowser.Nodes['coll-language'] =
      pgBrowser.Collection.extend({
        node: 'language',
        label: gettext('Languages'),
        type: 'coll-language',
        columns: ['name', 'lanowner', 'description'],
      });
  }

  // Extend the browser's node class for language node
  if (!pgBrowser.Nodes['language']) {
    pgBrowser.Nodes['language'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'language',
      sqlAlterHelp: 'sql-alterlanguage.html',
      sqlCreateHelp: 'sql-createlanguage.html',
      dialogHelp: url_for('help.static', {'filename': 'language_dialog.html'}),
      label: gettext('Language'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for language
        pgBrowser.add_menus([{
          name: 'create_language_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_language_on_coll', node: 'coll-language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
        },{
          name: 'create_language', node: 'language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
        }]);
      },
      // Define the model for language node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          lanowner: undefined,
          comment: undefined,
          lanacl: [],
          seclabels:[],
          trusted: true,
          lanproc: undefined,
          laninl: undefined,
          lanval: undefined,
          is_template: false,
          template_list: [],
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'lanowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the language node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          control: 'node-ajax-options', mode: ['properties', 'create', 'edit'],
          url:'get_templates', select2: { allowClear: false, tags: true, multiple: false },
          transform: function(data, cell) {
            var res = [],
              control = cell || this,
              label = control.model.get('name');

            if (!control.model.isNew()) {
              res.push({label: label, value: label});
            }
            else {
              var tmp_list = [];
              if (data && _.isArray(data)) {
                _.each(data, function(d) {
                  res.push({label: d.tmplname, value: d.tmplname});
                  tmp_list.push(d.tmplname);
                });
              }
              this.model.set({'template_list': tmp_list});
            }

            return res;
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },{
          id: 'lanowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false },
        },{
          id: 'acl', label: gettext('Privileges'), type: 'text',
          group: gettext('Security'), mode: ['properties'],
        },{
          id: 'is_sys_obj', label: gettext('System language?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },{
          id: 'trusted', label: gettext('Trusted?'), type: 'switch',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], deps: ['name'],
          disabled: function(m) {
            if (m.isNew()) {
              if (m.get('template_list').indexOf(m.get('name')) == -1) {
                m.set({'is_template': false});
                return false;
              }
              else {
                m.set({'is_template': true});
                return true;
              }
            }
            return false;
          },
          readonly: function(m) {return !m.isNew();},
        },{
          id: 'lanproc', label: gettext('Handler function'), type: 'text', control: 'node-ajax-options',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], url:'get_functions',
          deps: ['name'], first_empty: false,
          /* This function is used to populate the handler function
           * for the selected language node. It will check if the property
           * type is 'handler' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                if (d.prop_type == 'handler') {
                  res.push({label: d.label, value: d.label});
                }
              });
            }
            return res;
          }, disabled: function(m) {
            if (m.isNew()) {
              return m.get('template_list').indexOf(m.get('name')) != -1;
            }
            return false;
          },
          readonly: function(m) {return !m.isNew();},
        },{
          id: 'laninl', label: gettext('Inline function'), type: 'text', control: 'node-ajax-options',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], url:'get_functions',
          deps: ['name'], first_empty: false,
          /* This function is used to populate the inline function
           * for the selected language node. It will check if the property
           * type is 'inline' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                if (d.prop_type == 'inline') {
                  res.push({label: d.label, value: d.label});
                }
              });
            }
            return res;
          }, disabled: function(m) {
            if (m.isNew()) {
              return m.get('template_list').indexOf(m.get('name')) != -1;
            }
            return false;
          },
          readonly: function(m) {return !m.isNew();},
        },{
          id: 'lanval', label: gettext('Validator function'), type: 'text', control: 'node-ajax-options',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], url:'get_functions',
          deps: ['name'],
          /* This function is used to populate the validator function
           * for the selected language node. It will check if the property
           * type is 'validator' then push the data into the result array.
           */
          transform: function(data) {
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                if (d.prop_type == 'validator') {
                  res.push({label: d.label, value: d.label});
                }
              });
            }
            return res;
          }, disabled: function(m) {
            if (m.isNew()) {
              return m.get('template_list').indexOf(m.get('name')) != -1;
            }
            return false;
          },
          readonly: function(m) {return !m.isNew();},
        }, {
          id: 'lanacl', label: gettext('Privileges'), type: 'collection',
          group: gettext('Security'), control: 'unique-col-collection', mode: ['edit', 'create'],
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['U'],
          }), canAdd: true, canDelete: true, uniqueCol : ['grantee'],
        },{
          id: 'seclabels', label: gettext('Security labels'), mode: ['edit', 'create'],
          model: pgBrowser.SecLabelModel, editable: false,
          type: 'collection', group: gettext('Security'), min_version: 90200,
          canAdd: true, canEdit: false, canDelete: true,
          control: 'unique-col-collection',
        },
        ],
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var name = this.get('name'),
            msg;

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }

          // If predefined template is selected then no need to validate it.
          if (!this.get('is_template')) {
            var handler_func = this.get('lanproc');
            if (_.isUndefined(handler_func) || _.isNull(handler_func) ||
              String(handler_func).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Handler function cannot be empty.');
              this.errorModel.set('lanproc', msg);
              return msg;
            } else {
              this.errorModel.unset('lanproc');
            }
          }

          return null;
        },
      }),
    });
  }
  return pgBrowser.Nodes['coll-language'];
});
