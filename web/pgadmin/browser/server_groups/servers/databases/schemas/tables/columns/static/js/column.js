/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.column', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-column']) {
    pgBrowser.Nodes['coll-column'] =
      pgBrowser.Collection.extend({
        node: 'column',
        label: gettext('Columns'),
        type: 'coll-column',
        columns: ['name', 'atttypid', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: false,
      });
  }

  // This Node model will be used for variable control for column
  var VariablesModel = Backform.VariablesModel = pgBrowser.Node.Model.extend({
    idAttribute: 'name',
    defaults: {
      name: null,
      value: null,
    },
    schema: [{
      id: 'name', label: gettext('Name'), cell: 'select2',
      type: 'text', disabled: false, node: 'column',
      options: [['n_distinct', 'n_distinct'],
        ['n_distinct_inherited','n_distinct_inherited']],
      select2: {placeholder: gettext('Select variable')},
      cellHeaderClasses:'width_percent_50',
    },{
      id: 'value', label: gettext('Value'),
      type: 'text', disabled: false,
      cellHeaderClasses:'width_percent_50',
    }],
    validate: function() {
      if (
        _.isUndefined(this.get('value')) ||
        _.isNull(this.get('value')) ||
        String(this.get('value')).replace(/^\s+|\s+$/g, '') == ''
      ) {
        var errmsg = gettext('Please provide input for variable.');
        this.errorModel.set('value', errmsg);
        return errmsg;
      } else {
        this.errorModel.unset('value');
      }
      return null;
    },
  });

  // Integer Cell for Columns Length and Precision
  var IntegerDepCell = Backgrid.Extension.IntegerDepCell =
    Backgrid.IntegerCell.extend({
      initialize: function() {
        Backgrid.NumberCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        this.model.set(this.column.get('name'), null);
        this.render();
        return this;
      },
      render: function() {
        Backgrid.NumberCell.prototype.render.apply(this, arguments);

        var model = this.model,
          column = this.column,
          editable = this.column.get('editable'),
          is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;

        if (is_editable){ this.$el.addClass('editable'); }
        else { this.$el.removeClass('editable'); }
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove,
    });

  if (!pgBrowser.Nodes['column']) {
    pgBrowser.Nodes['column'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'mview'],
      collection_type: ['coll-table', 'coll-view', 'coll-mview'],
      type: 'column',
      label: gettext('Column'),
      hasSQL:  true,
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-altertable.html',
      dialogHelp: url_for('help.static', {'filename': 'column_dialog.html'}),
      canDrop: function(itemData, item){
        let node = pgBrowser.treeMenu.findNodeByDomElement(item);

        if (!node)
          return false;

        // Only a column of a table can be droped, and only when it is not of
        // catalog.
        return node.anyParent(
          (parentNode) => (
            parentNode.getData()._type === 'table' &&
              !parentNode.anyParent(
                (grandParentNode) => (
                  grandParentNode.getData()._type === 'catalog'
                )
              )
          )
        );
      },
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_column_on_coll', node: 'coll-column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column', node: 'column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'attnum',

        defaults: {
          name: undefined,
          attowner: undefined,
          atttypid: undefined,
          attnum: undefined,
          cltype: undefined,
          collspcname: undefined,
          attacl: undefined,
          description: undefined,
          parent_tbl: undefined,
          min_val_attlen: undefined,
          min_val_attprecision: undefined,
          max_val_attlen: undefined,
          max_val_attprecision: undefined,
          edit_types: undefined,
          is_primary_key: false,
          inheritedfrom: undefined,
          attstattarget:undefined,
          attnotnull: false,
          attlen: null,
          attprecision: null,
          attidentity: 'a',
          seqincrement: undefined,
          seqstart: undefined,
          seqmin: undefined,
          seqmax: undefined,
          seqcache: undefined,
          seqcycle: undefined,
          colconstype: 'n',
          genexpr: undefined,
        },
        initialize: function(attrs) {
          if (_.size(attrs) !== 0) {
            this.set({
              'old_attidentity': this.get('attidentity'),
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);

        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchemaWithColumnCheck',
          cellHeaderClasses:'width_percent_30',
          editable: 'editable_check_for_table',
        },{
          // Need to show this field only when creating new table
          // [in SubNode control]
          id: 'is_primary_key', label: gettext('Primary key?'),
          cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
          deps:['name'], cellHeaderClasses:'width_percent_5',
          options: {
            onText: gettext('Yes'), offText: gettext('No'),
            onColor: 'success', offColor: 'ternary',
          },
          visible: function(m) {
            return _.isUndefined(
              m.top.node_info['table'] || m.top.node_info['view'] ||
                m.top.node_info['mview']
            );
          },
          disabled: function(m){
            // Disable it, when one of this:
            // - Primary key already exist
            // - Table is a partitioned table
            if (
              m.top && ((
                !_.isUndefined(m.top.get('oid')) &&
                  !_.isUndefined(m.top.get('primary_key')) &&
                  m.top.get('primary_key').length > 0 &&
                  !_.isUndefined(m.top.get('primary_key').first().get('oid'))
              ) || (
                m.top.has('is_partitioned') && m.top.get('is_partitioned') &&
                m.top.node_info.server && m.top.node_info.server.version < 11000
              ))
            ) {
              return true;
            }

            var name = m.get('name');

            if(!m.inSchemaWithColumnCheck.apply(this, [m]) &&
            (_.isUndefined(name)  || _.isNull(name) || name == '')) {
              return true;
            }
            return false;
          },
          editable: function(m) {
            // If HeaderCell then allow True
            if(m instanceof Backbone.Collection) {
              return true;
            }
            // If primary key already exist then disable.
            if (m.top && !_.isUndefined(m.top.get('oid')) &&
                      !_.isUndefined(m.top.get('primary_key')) &&
                      m.top.get('primary_key').length > 0 &&
                      !_.isUndefined(m.top.get('primary_key').first().get('oid'))) {

              return false;
            }

            // If table is partitioned table then disable
            if (m.top && !_.isUndefined(m.top.get('is_partitioned')) &&
              m.top.get('is_partitioned') && m.top.node_info.server &&
              m.top.node_info.server.version < 11000)
            {
              setTimeout(function () {
                m.set('is_primary_key', false);
              }, 10);

              return false;
            }

            if(!m.inSchemaWithColumnCheck.apply(this, [m])) {
              return true;
            }
            return false;
          },
        },{
          id: 'attnum', label: gettext('Position'), cell: 'string',
          type: 'text', disabled: 'notInSchema', mode: ['properties'],
        },{
          id: 'cltype', label: gettext('Data type'),
          cell: Backgrid.Extension.NodeAjaxOptionsCell,
          type: 'text', disabled: 'inSchemaWithColumnCheck',
          control: 'node-ajax-options', url: 'get_types', node: 'table',
          cellHeaderClasses:'width_percent_30', first_empty: true,
          select2: { allowClear: false }, group: gettext('Definition'),
          cache_node: 'table',
          transform: function(data, cell) {
            /* 'transform' function will be called by control, and cell both.
             * The way, we use the transform in cell, and control is different.
             * Because - options are shared using 'column' object in backgrid,
             * hence - the cell is passed as second parameter, while the control
             * uses (this) as a object.
             */
            var control = cell || this,
              m = control.model;

            /* We need different data in create mode & in edit mode
             * if we are in create mode then return data as it is
             * if we are in edit mode then we need to filter data
             */
            control.model.datatypes = data;
            var edit_types = m.get('edit_types'),
              result = [];

            // If called from Table, We will check if in edit mode
            // then send edit_types only
            if( !_.isUndefined(m.top) && !m.top.isNew() ) {
              _.each(data, function(t) {
                if (_.indexOf(edit_types, t.value) != -1) {
                  result.push(t);
                }
              });
              // There may be case that user adds new column in  existing collection
              // we will not have edit types then
              return result.length > 0 ? result : data;
            }

            // If called from Column
            if(m.isNew()) {
              return data;
            } else {
              //edit mode
              _.each(data, function(t) {
                if (_.indexOf(edit_types, t.value) != -1) {
                  result.push(t);
                }
              });

              return result;
            }
          },
          editable: 'editable_check_for_table',
        },{
          // Need to show this field only when creating new table [in SubNode control]
          id: 'inheritedfrom', label: gettext('Inherited from table'),
          type: 'text', readonly: true, editable: false,
          cellHeaderClasses:'width_percent_10',
          visible: function(m) {
            return _.isUndefined(m.top.node_info['table'] || m.top.node_info['view'] || m.top.node_info['mview']);
          },
        },{
          id: 'attlen', label: gettext('Length/Precision'), cell: IntegerDepCell,
          deps: ['cltype'], type: 'int', group: gettext('Definition'), cellHeaderClasses:'width_percent_20',
          disabled: function(m) {
            var of_type = m.get('cltype'),
              flag = true;
            _.each(m.datatypes, function(o) {
              if ( of_type == o.value ) {
                if(o.length)
                {
                  m.set('min_val_attlen', o.min_val, {silent: true});
                  m.set('max_val_attlen', o.max_val, {silent: true});
                  flag = false;
                }
              }
            });

            flag && setTimeout(function() {
              if(m.get('attlen')) {
                m.set('attlen', null);
              }
            },10);

            return flag;
          },
          editable: function(m) {
            // inheritedfrom has value then we should disable it
            if(!_.isUndefined(m.get('inheritedfrom'))) {
              return false;
            }

            if (!m.datatypes) {
              // datatypes not loaded, may be this call is from CallByNeed from backgrid cell initialize.
              return true;
            }
            var of_type = m.get('cltype'),
              flag = false;

            _.each(m.datatypes, function(o) {
              if ( of_type == o.value ) {
                if(o.length) {
                  m.set('min_val_attlen', o.min_val, {silent: true});
                  m.set('max_val_attlen', o.max_val, {silent: true});
                  flag = true;
                }
              }
            });

            !flag && setTimeout(function() {
              if(m.get('attlen')) {
                m.set('attlen', null, {silent: true});
              }
            },10);

            return flag;
          },
        },{
          id: 'attprecision', label: gettext('Scale'), cell: IntegerDepCell,
          deps: ['cltype'], type: 'int', group: gettext('Definition'), cellHeaderClasses:'width_percent_20',
          disabled: function(m) {
            var of_type = m.get('cltype'),
              flag = true;
            _.each(m.datatypes, function(o) {
              if ( of_type == o.value ) {
                if(o.precision) {
                  m.set('min_val_attprecision', 0, {silent: true});
                  m.set('max_val_attprecision', o.max_val, {silent: true});
                  flag = false;
                }
              }
            });

            flag && setTimeout(function() {
              if(m.get('attprecision')) {
                m.set('attprecision', null);
              }
            },10);
            return flag;
          },
          editable: function(m) {
            // inheritedfrom has value then we should disable it
            if(!_.isUndefined(m.get('inheritedfrom'))) {
              return false;
            }

            if (!m.datatypes) {
              // datatypes not loaded yet, may be this call is from CallByNeed from backgrid cell initialize.
              return true;
            }

            var of_type = m.get('cltype'),
              flag = false;
            _.each(m.datatypes, function(o) {
              if ( of_type == o.value ) {
                if(o.precision) {
                  m.set('min_val_attprecision', 0, {silent: true});
                  m.set('max_val_attprecision', o.max_val, {silent: true});
                  flag = true;
                }
              }
            });

            !flag && setTimeout(function() {
              if(m.get('attprecision')) {
                m.set('attprecision', null);
              }
            },10);

            return flag;
          },
        },{
          id: 'collspcname', label: gettext('Collation'), cell: 'string',
          type: 'text', control: 'node-ajax-options', url: 'get_collations',
          group: gettext('Definition'), node: 'collation',
          deps: ['cltype'], disabled: function(m) {
            var of_type = m.get('cltype'),
              flag = true;
            _.each(m.datatypes, function(o) {
              if ( of_type == o.value ) {
                if(o.is_collatable)
                {
                  flag = false;
                }
              }
            });
            if (flag) {
              setTimeout(function(){
                if(m.get('collspcname') && m.get('collspcname') !== '') {
                  m.set('collspcname', '');
                }
              }, 10);
            }
            return flag;
          },
        },{
          id: 'attstattarget', label: gettext('Statistics'), cell: 'string',
          type: 'text', disabled: 'inSchemaWithColumnCheck', mode: ['properties', 'edit'],
          group: gettext('Definition'),
        },{
          id: 'attstorage', label: gettext('Storage'), group: gettext('Definition'),
          type: 'text', mode: ['properties', 'edit'],
          cell: 'string', disabled: 'inSchemaWithColumnCheck', first_empty: true,
          control: 'select2', select2: { placeholder: gettext('Select storage'),
            allowClear: false,
            width: '100%',
          },
          options: [
            {label: 'PLAIN', value: 'p'},
            {label: 'MAIN', value: 'm'},
            {label: 'EXTERNAL', value: 'e'},
            {label: 'EXTENDED', value: 'x'},
          ],
        },{
          id: 'defval', label: gettext('Default'), cell: 'string',
          type: 'text', group: gettext('Constraints'), deps: ['cltype', 'colconstype'],
          disabled: function(m) {
            var is_disabled = false;
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              var type = m.get('cltype');
              is_disabled = (type == 'serial' || type == 'bigserial' || type == 'smallserial');
            }

            is_disabled = is_disabled || m.get('colconstype') != 'n';
            if (is_disabled && m.isNew()) {
              setTimeout(function () {
                m.set('defval', undefined);
              }, 10);
            }

            return is_disabled;
          },
        },{
          id: 'attnotnull', label: gettext('Not NULL?'), cell: 'switch',
          type: 'switch', cellHeaderClasses:'width_percent_20',
          group: gettext('Constraints'), editable: 'editable_check_for_table',
          options: { onText: gettext('Yes'), offText: gettext('No'), onColor: 'success', offColor: 'ternary' },
          deps: ['colconstype'],
          disabled: function(m) {
            if (m.get('colconstype') == 'i') {
              setTimeout(function () {
                m.set('attnotnull', true);
              }, 10);
            }
            return m.inSchemaWithColumnCheck(m);
          },
        }, {
          id: 'colconstype',
          label: gettext('Type'),
          cell: 'string',
          type: 'radioModern',
          controlsClassName: 'pgadmin-controls col-12 col-sm-9',
          controlLabelClassName: 'control-label col-sm-3 col-12',
          group: gettext('Constraints'),
          options: function(m) {
            var opt_array = [
              {'label': gettext('NONE'), 'value': 'n'},
              {'label': gettext('IDENTITY'), 'value': 'i'},
            ];

            if (m.top.node_info && m.top.node_info.server &&
                m.top.node_info.server.version >= 120000) {
              // You can't change the existing column to Generated column.
              if (m.isNew()) {
                opt_array.push({
                  'label': gettext('GENERATED'),
                  'value': 'g',
                });
              } else {
                opt_array.push({
                  'label': gettext('GENERATED'),
                  'value': 'g',
                  'disabled': true,
                });
              }
            }

            return opt_array;
          },
          disabled: function(m) {
            if (!m.isNew() && m.get('colconstype') == 'g') {
              return true;
            }
            return false;
          },
          visible: function(m) {
            if (m.top.node_info && m.top.node_info.server &&
                m.top.node_info.server.version >= 100000) {
              return true;
            }
            return false;
          },
        }, {
          id: 'attidentity', label: gettext('Identity'), control: 'select2',
          cell: 'select2',
          select2: {placeholder: gettext('Select identity'), allowClear: false, width: '100%'},
          min_version: 100000, group: gettext('Constraints'),
          'options': [
            {label: gettext('ALWAYS'), value: 'a'},
            {label: gettext('BY DEFAULT'), value: 'd'},
          ],
          deps: ['colconstype'], visible: 'isTypeIdentity',
          disabled: function(m) {
            if (!m.isNew()) {
              if (m.get('attidentity') == '' && m.get('colconstype') == 'i') {
                setTimeout(function () {
                  m.set('attidentity', m.get('old_attidentity'));
                }, 10);
              }
            }
            return false;
          },
        }, {
          id: 'seqincrement', label: gettext('Increment'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          min: 1, deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
          visible: 'isTypeIdentity',
        },{
          id: 'seqstart', label: gettext('Start'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          disabled: function(m) {
            let isIdentity = m.get('attidentity');
            if(!_.isUndefined(isIdentity) && !_.isNull(isIdentity) && !_.isEmpty(isIdentity))
              return false;
            return true;
          }, deps: ['attidentity', 'colconstype'],
          visible: 'isTypeIdentity',
        },{
          id: 'seqmin', label: gettext('Minimum'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
          visible: 'isTypeIdentity',
        },{
          id: 'seqmax', label: gettext('Maximum'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
          visible: 'isTypeIdentity',
        },{
          id: 'seqcache', label: gettext('Cache'), type: 'int',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          min: 1, deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
          visible: 'isTypeIdentity',
        },{
          id: 'seqcycle', label: gettext('Cycled'), type: 'switch',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          deps: ['attidentity', 'colconstype'], disabled: 'isIdentityColumn',
          visible: 'isTypeIdentity',
        },{
          id: 'genexpr', label: gettext('Expression'), type: 'text',
          mode: ['properties', 'create', 'edit'], group: gettext('Constraints'),
          min_version: 120000, deps: ['colconstype'], visible: 'isTypeGenerated',
          readonly: function(m) {
            return !m.isNew();
          },
        },{
          id: 'is_pk', label: gettext('Primary key?'),
          type: 'switch', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'is_fk', label: gettext('Foreign key?'),
          type: 'switch', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'is_inherited', label: gettext('Inherited?'),
          type: 'switch', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'tbls_inherited', label: gettext('Inherited from table(s)'),
          type: 'text', mode: ['properties'], deps: ['is_inherited'],
          group: gettext('Definition'),
          visible: function(m) {
            return (!_.isUndefined(m.get('is_inherited')) && m.get('is_inherited'));
          },
        },{
          id: 'is_sys_column', label: gettext('System column?'), cell: 'string',
          type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'notInSchema',
        },{
          id: 'attoptions', label: gettext('Variables'), type: 'collection',
          group: gettext('Variables'), control: 'unique-col-collection',
          model: VariablesModel, uniqueCol : ['name'],
          mode: ['edit', 'create'], canAdd: true, canEdit: false,
          canDelete: true,
        }, pgBrowser.SecurityGroupSchema, {
          id: 'attacl', label: gettext('Privileges'), type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['a','r','w','x']}),
          mode: ['edit'], canAdd: true, canDelete: true,
          uniqueCol : ['grantee'],
        },{
          id: 'seclabels', label: gettext('Security labels'), canAdd: true,
          model: pgBrowser.SecLabelModel, group: 'security',
          mode: ['edit', 'create'], editable: false, type: 'collection',
          min_version: 90100, canEdit: false, canDelete: true,
          control: 'unique-col-collection',
        }],
        validate: function(keys) {
          var msg = undefined;

          // Nothing to validate
          if (keys && keys.length == 0) {
            this.errorModel.clear();
            return null;
          } else {
            this.errorModel.clear();
          }

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Column name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('cltype'))
              || String(this.get('cltype')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Column type cannot be empty.');
            this.errorModel.set('cltype', msg);
            return msg;
          }

          if (!_.isUndefined(this.get('cltype'))
                && !_.isUndefined(this.get('attlen'))
                && !_.isNull(this.get('attlen'))
                && this.get('attlen') !== '') {
            // Validation for Length field
            if (this.get('attlen') < this.get('min_val_attlen'))
              msg = gettext('Length/Precision should not be less than: ') + this.get('min_val_attlen');
            if (this.get('attlen') > this.get('max_val_attlen'))
              msg = gettext('Length/Precision should not be greater than: ') + this.get('max_val_attlen');
            // If we have any error set then throw it to user
            if(msg) {
              this.errorModel.set('attlen', msg);
              return msg;
            }
          }

          if (!_.isUndefined(this.get('cltype'))
                && !_.isUndefined(this.get('attprecision'))
                && !_.isNull(this.get('attprecision'))
                && this.get('attprecision') !== '') {
            // Validation for precision field
            if (this.get('attprecision') < this.get('min_val_attprecision'))
              msg = gettext('Scale should not be less than: ') + this.get('min_val_attprecision');
            if (this.get('attprecision') > this.get('max_val_attprecision'))
              msg = gettext('Scale should not be greater than: ') + this.get('max_val_attprecision');
            // If we have any error set then throw it to user
            if(msg) {
              this.errorModel.set('attprecision', msg);
              return msg;
            }
          }

          let genexpr = this.get('genexpr');
          if (this.get('colconstype') == 'g' &&
            (_.isUndefined(genexpr) || _.isNull(genexpr) || genexpr == '')) {
            msg = gettext('Expression value cannot be empty.');
            this.errorModel.set('genexpr', msg);
            return msg;
          } else {
            this.errorModel.unset('genexpr');
          }

          var  minimum = this.get('seqmin'),
            maximum = this.get('seqmax'),
            start = this.get('seqstart');

          if (!this.isNew() && this.get('colconstype') == 'i' &&
            (this.get('old_attidentity') == 'a' || this.get('old_attidentity') == 'd') &&
            (this.get('attidentity') == 'a' || this.get('attidentity') == 'd')) {
            if (_.isUndefined(this.get('seqincrement'))
              || String(this.get('seqincrement')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Increment value cannot be empty.');
              this.errorModel.set('seqincrement', msg);
              return msg;
            } else {
              this.errorModel.unset('seqincrement');
            }

            if (_.isUndefined(this.get('seqmin'))
              || String(this.get('seqmin')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Minimum value cannot be empty.');
              this.errorModel.set('seqmin', msg);
              return msg;
            } else {
              this.errorModel.unset('seqmin');
            }

            if (_.isUndefined(this.get('seqmax'))
              || String(this.get('seqmax')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Maximum value cannot be empty.');
              this.errorModel.set('seqmax', msg);
              return msg;
            } else {
              this.errorModel.unset('seqmax');
            }

            if (_.isUndefined(this.get('seqcache'))
              || String(this.get('seqcache')).replace(/^\s+|\s+$/g, '') == '') {
              msg = gettext('Cache value cannot be empty.');
              this.errorModel.set('seqcache', msg);
              return msg;
            } else {
              this.errorModel.unset('seqcache');
            }
          }
          var min_lt = gettext('Minimum value must be less than maximum value.'),
            start_lt = gettext('Start value cannot be less than minimum value.'),
            start_gt = gettext('Start value cannot be greater than maximum value.');

          if (_.isEmpty(minimum) || _.isEmpty(maximum))
            return null;

          if ((minimum == 0 && maximum == 0) ||
              (parseInt(minimum, 10) >= parseInt(maximum, 10))) {
            this.errorModel.set('seqmin', min_lt);
            return min_lt;
          } else {
            this.errorModel.unset('seqmin');
          }

          if (start && minimum && parseInt(start) < parseInt(minimum)) {
            this.errorModel.set('seqstart', start_lt);
            return start_lt;
          } else {
            this.errorModel.unset('seqstart');
          }

          if (start && maximum && parseInt(start) > parseInt(maximum)) {
            this.errorModel.set('seqstart', start_gt);
            return start_gt;
          } else {
            this.errorModel.unset('seqstart');
          }

          return null;
        },
        // Check whether the column is identity column or not
        isIdentityColumn: function(m) {
          let isIdentity = m.get('attidentity');
          if(!_.isUndefined(isIdentity) && !_.isNull(isIdentity) && !_.isEmpty(isIdentity))
            return false;
          return true;
        },
        // Check whether the column is a identity column
        isTypeIdentity: function(m) {
          let colconstype = m.get('colconstype');
          if (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'i') {
            return true;
          }
          return false;
        },
        // Check whether the column is a generated column
        isTypeGenerated: function(m) {
          let colconstype = m.get('colconstype');
          if (!_.isUndefined(colconstype) && !_.isNull(colconstype) && colconstype == 'g') {
            return true;
          }
          return false;
        },
        // We will check if we are under schema node & in 'create' mode
        notInSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // We will disable control if it's in 'edit' mode
            return !(m.isNew());
          }
          return true;
        },
        // Checks weather to enable/disable control
        inSchemaWithColumnCheck: function(m) {
          var node_info = this.node_info || m.node_info || m.top.node_info;

          // disable all fields if column is listed under view or mview
          if (node_info && ('view' in node_info || 'mview' in node_info)) {
            if (this && _.has(this, 'name') && (this.name != 'defval')) {
              return true;
            }
          }

          if(node_info &&  'schema' in node_info)
          {
            // We will disable control if it's system columns
            // inheritedfrom check is useful when we use this schema in table node
            // inheritedfrom has value then we should disable it
            if(!_.isUndefined(m.get('inheritedfrom'))) {
              return true;
            }
            // ie: it's position is less then 1
            if (m.isNew()) {
              return false;
            }
            // if we are in edit mode
            return !(!_.isUndefined(m.get('attnum')) && m.get('attnum') > 0 );
          }
          return true;
        },
        editable_check_for_table: function(arg) {
          if (arg instanceof Backbone.Collection) {
            return !arg.model.prototype.inSchemaWithColumnCheck.apply(
              this, [arg.top]
            );
          } else {
            return !arg.inSchemaWithColumnCheck.apply(
              this, [arg]
            );
          }
        },
      }),
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [];
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to create table
          if (_.indexOf(['schema'], d._type) > -1) {
            return true;
          }
          else if (_.indexOf(['view', 'coll-view',
            'mview',
            'coll-mview'], d._type) > -1) {
            parents.push(d._type);
            break;
          }
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // If node is under catalog then do not allow 'create' menu
        return !(_.indexOf(parents, 'catalog') > -1 ||
          _.indexOf(parents, 'coll-view') > -1 ||
          _.indexOf(parents, 'coll-mview') > -1 ||
          _.indexOf(parents, 'mview') > -1 ||
          _.indexOf(parents, 'view') > -1);
      },
    });
  }

  return pgBrowser.Nodes['column'];
});
