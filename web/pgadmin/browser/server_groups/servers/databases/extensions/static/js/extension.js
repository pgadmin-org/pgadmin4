/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.extension', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

  /*
   * Create and Add an Extension Collection into nodes
   * Params:
   *   label - Label for Node
   *   type - Type of Node
   *   columns - List of columns to show under under properties.
   */
  if (!pgBrowser.Nodes['coll-extension']) {
    pgAdmin.Browser.Nodes['coll-extension'] =
      pgAdmin.Browser.Collection.extend({
        node: 'extension',
        label: gettext('Extensions'),
        type: 'coll-extension',
        columns: ['name', 'owner', 'comment'],
      });
  }

  /*
   * Create and Add an Extension Node into nodes
   * Params:
   *   parent_type - Name of parent Node
   *   type - Type of Node
   *   hasSQL - True if we need to show SQL query Tab control, otherwise False
   *   canDrop - True to show "Drop Extension" link under Context menu,
   *    otherwise False
   *   canDropCascade - True to show "Drop Cascade" link under Context menu,
   *    otherwise False
   *   columns - List of columns to show under under properties tab.
   *   label - Label for Node
   */
  if (!pgBrowser.Nodes['extension']) {
    pgAdmin.Browser.Nodes['extension'] =
    pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'extension',
      sqlAlterHelp: 'sql-alterextension.html',
      sqlCreateHelp: 'sql-createextension.html',
      dialogHelp: url_for('help.static', {'filename': 'extension_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      label: gettext('Extension'),

      Init: function() {
        if(this.initialized)
          return;

        this.initialized = true;

        /*
         * Add "create extension" menu item into context and object menu
         * for the following nodes:
         * coll-extension, extension and database.
         */
        pgBrowser.add_menus([{
          name: 'create_extension_on_coll', node: 'coll-extension', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          icon: 'wcTabIcon icon-extension', data: {action: 'create'},
        },{
          name: 'create_extension', node: 'extension', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          icon: 'wcTabIcon icon-extension', data: {action: 'create'},
        },{
          name: 'create_extension', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          icon: 'wcTabIcon icon-extension', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },
        ]);
      },

      /*
       * Define model for the Node and specify the properties
       * of the model in schema.
       */
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        schema: [
          {
            id: 'name', label: gettext('Name'), first_empty: true,
            type: 'text', mode: ['properties', 'create', 'edit'],
            visible: true, url:'avails', readonly: function(m) {
              return !m.isNew();
            },
            transform: function(data, cell) {
              var res = [],
                control = cell || this,
                label = control.model.get('name');

              if (!control.model.isNew()) {
                res.push({label: label, value: label});
              }
              else {
                if (data && _.isArray(data)) {
                  _.each(data, function(d) {
                    if (d.installed_version === null)

                      /*
                       * d contains json data and sets into
                       * select's option control
                       *
                       * We need to stringify data because formatter will
                       * convert Array Object as [Object] string
                       */
                      res.push({label: d.name, value: JSON.stringify(d)});
                  });
                }
              }
              return res;
            },

            /*
             * extends NodeAjaxOptionsControl to override the properties
             * getValueFromDOM which takes stringified data from option of
             * select control and parse it. And `onChange` takes the stringified
             * data from select's option, thus convert it to json format and set the
             * data into Model which is used to enable/disable the schema field.
             */
            control: Backform.NodeAjaxOptionsControl.extend({
              getValueFromDOM: function() {
                var data = this.formatter.toRaw(
                  _.unescape(this.$el.find('select').val()), this.model);
                /*
                 * return null if data is empty to prevent it from
                 * throwing parsing error. Adds check as name can be empty
                 */
                if (data === '') {
                  return null;
                }
                else if (typeof(data) === 'string') {
                  data=JSON.parse(data);
                }
                return data.name;
              },

              /*
               * When name is changed, extract value from its select option and
               * set attributes values into the model
               */
              onChange: function() {
                Backform.NodeAjaxOptionsControl.prototype.onChange.apply(
                  this, arguments
                );
                var selectedValue = this.$el.find('select').val();
                if (selectedValue.trim() != '') {
                  var d = this.formatter.toRaw(selectedValue, this.model);
                  if(typeof(d) === 'string')
                    d=JSON.parse(d);
                  this.model.set({
                    'version' : '',
                    'relocatable': (
                      (!_.isNull(d.relocatable[0]) &&
                        !_.isUndefined(d.relocatable[0])) ? d.relocatable[0]: ''
                    ),
                  });
                } else {
                  this.model.set({
                    'version': '', 'relocatable': true, 'schema': '',
                  });
                }
              },
            }),
          },
          {
            id: 'oid', label: gettext('OID'), cell: 'string',
            type: 'text', mode: ['properties'],
          },
          {
            id: 'owner', label: gettext('Owner'), control: 'node-list-by-name',
            mode: ['properties'], node: 'role', cell: 'string',
            cache_level: 'server',
          },
          {
            id: 'schema', label: gettext('Schema'), type: 'text',
            control: 'node-list-by-name', group: gettext('Definition'),
            mode: ['properties', 'create', 'edit'], deps: ['relocatable'],
            node: 'schema', first_empty: true,
            disabled: function(m) {
              /*
               * enable or disable schema field if model's relocatable
               * attribute is True or False
               */
              return (m.has('relocatable') ? !m.get('relocatable') : false);
            },
          },
          {
            id: 'relocatable', label: gettext('Relocatable?'), cell: 'switch',
            group: gettext('Definition'), type: 'switch', mode: ['properties'],
          },
          {
            id: 'version', label: gettext('Version'), cell: 'string',
            mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
            control: 'node-ajax-options', url:'avails', first_empty: true,

            // Transform the data into version for the selected extension.
            transform: function(data, cell) {
              var res = [],
                control = cell || this,
                extension = control.model.get('name');

              _.each(data, function(dt) {
                if(dt.name == extension) {
                  if(dt.version && _.isArray(dt.version)) {
                    _.each(dt.version, function(v) {
                      res.push({ label: v, value: v });
                    });
                  }
                }
              });
              return res;
            },
          },{
            id: 'is_sys_obj', label: gettext('System extension?'),
            cell:'boolean', type: 'switch', mode: ['properties'],
          },{
            id: 'comment', label: gettext('Comment'), cell: 'string',
            type: 'multiline', readonly: true,
          },
        ],
        validate: function() {

          /*
          * Triggers error messages for name
          * if it is empty/undefined/null
          */
          var err = {},
            errmsg,
            name = this.get('name');
          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }
          else {
            this.errorModel.unset('name');
          }
          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['coll-extension'];
});
