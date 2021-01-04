/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.index', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'backbone', 'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Alertify, Backform,
  Backgrid, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-index']) {
    pgAdmin.Browser.Nodes['coll-index'] =
      pgAdmin.Browser.Collection.extend({
        node: 'index',
        label: gettext('Indexes'),
        type: 'coll-index',
        columns: ['name', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Size'), gettext('Index size')],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Node-Ajax-Cell with Deps
  var NodeAjaxOptionsDepsCell = Backgrid.Extension.NodeAjaxOptionsCell.extend({
    initialize: function() {
      Backgrid.Extension.NodeAjaxOptionsCell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },
    dependentChanged: function () {
      var model = this.model,
        column = this.column,
        editable = this.column.get('editable'),
        input = this.$el.find('select').first();

      var is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
      if (is_editable) {
        this.$el.addClass('editable');
        input.prop('disabled', false);
      } else {
        this.$el.removeClass('editable');
        input.prop('disabled', true);
      }

      this.delegateEvents();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });


  // Model to create column collection control
  var ColumnModel = pgAdmin.Browser.Node.Model.extend({
    defaults: {
      colname: undefined,
      collspcname: undefined,
      op_class: undefined,
      sort_order: false,
      nulls: false,
      is_sort_nulls_applicable: true,
    },
    schema: [
      {
        id: 'colname', label: gettext('Column'), cell: 'node-list-by-name',
        type: 'text', disabled: 'inSchema', readonly: 'isEditMode', editable: function(m) {
          // Header cell then skip
          if (m instanceof Backbone.Collection) {
            return false;
          }
          return !(m.inSchemaWithModelCheck.apply(this, arguments));
        },
        control: 'node-list-by-name', node: 'column',
      },{
        id: 'collspcname', label: gettext('Collation'),
        cell: NodeAjaxOptionsDepsCell,
        type: 'text', disabled: 'inSchema', readonly: 'isEditMode', editable: function(m) {
          // Header cell then skip
          if (m instanceof Backbone.Collection) {
            return false;
          }
          return !(m.inSchemaWithModelCheck.apply(this, arguments));
        },
        control: 'node-ajax-options', url: 'get_collations', node: 'index',
        url_jump_after_node: 'schema',
      },{
        id: 'op_class', label: gettext('Operator class'),
        cell: NodeAjaxOptionsDepsCell, tags: true,
        type: 'text', disabled: 'checkAccessMethod',
        editable: function(m) {
          // Header cell then skip
          if (m instanceof Backbone.Collection || m.inSchemaWithModelCheck.apply(this, arguments)) {
            return false;
          }
          return !(m.checkAccessMethod.apply(this, arguments));
        },
        control: 'node-ajax-options', url: 'get_op_class', node: 'index',
        url_jump_after_node: 'schema',
        deps: ['amname'], transform: function(data, control) {
          /* We need to extract data from collection according
           * to access method selected by user if not selected
           * send btree related op_class options
           */
          var amname = control.model.top.get('amname'),
            options = data['btree'];

          if(_.isUndefined(amname))
            return options;

          _.each(data, function(v, k) {
            if(amname === k) {
              options = v;
            }
          });
          return options;
        },
      },{
        id: 'sort_order', label: gettext('Sort order'),
        cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
        editable: function(m) {
          // Header cell then skip
          if (m instanceof Backbone.Collection) {
            return false;
          } else if (m.inSchemaWithModelCheck.apply(this, arguments)) {
            return false;
          } else if (m.top.get('amname') === 'btree') {
            m.set('is_sort_nulls_applicable', true);
            return true;
          } else {
            m.set('is_sort_nulls_applicable', false);
            return false;
          }
        },
        deps: ['amname'],
        options: {
          'onText': 'DESC', 'offText': 'ASC',
        },
      },{
        id: 'nulls', label: gettext('NULLs'),
        cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
        editable: function(m) {
          // Header cell then skip
          if (m instanceof Backbone.Collection) {
            return false;
          } else if (m.inSchemaWithModelCheck.apply(this, arguments)) {
            return false;
          } else if (m.top.get('amname') === 'btree') {
            m.set('is_sort_nulls_applicable', true);
            return true;
          } else {
            m.set('is_sort_nulls_applicable', false);
            return false;
          }
        },
        deps: ['amname', 'sort_order'],
        options: {
          'onText': 'FIRST', 'offText': 'LAST',
        },
      },
    ],
    validate: function() {
      this.errorModel.clear();

      if (_.isUndefined(this.get('colname'))
        || String(this.get('colname')).replace(/^\s+|\s+$/g, '') == '') {
        var msg = gettext('Column Name cannot be empty.');
        this.errorModel.set('colname', msg);
        return msg;
      }
    },
    // We will check if we are under schema node
    inSchema: function() {
      if(this.node_info &&  'catalog' in this.node_info) {
        return true;
      }
      return false;
    },
    isEditMode: function(m) {
      return !m.top.isNew();
    },
    // We will check if we are under schema node & in 'create' mode
    inSchemaWithModelCheck: function(m) {
      if(m.top.node_info &&  'schema' in m.top.node_info) {
        // We will disable control if it's in 'edit' mode
        return !m.top.isNew();
      }
      return true;
    },
    // We will check if we are under schema node and added condition
    checkAccessMethod: function(m) {
      //Access method is empty or btree then do not disable field
      var parent_model = m.top;
      if(_.isUndefined(parent_model.get('amname')) ||
        _.isNull(parent_model.get('amname')) ||
          String(parent_model.get('amname')).replace(/^\s+|\s+$/g, '') == '' ||
          parent_model.get('amname') === 'btree') {
        // We need to set nulls to true if sort_order is set to desc
        // nulls first is default for desc
        if(m.get('sort_order') == true && m.previous('sort_order') ==  false) {
          setTimeout(function() { m.set('nulls', true); }, 10);
        }
      }
      else {
        m.set('is_sort_nulls_applicable', false);
      }
      return false;
    },
  });

  if (!pgBrowser.Nodes['index']) {
    pgAdmin.Browser.Nodes['index'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'mview', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      sqlAlterHelp: 'sql-alterindex.html',
      sqlCreateHelp: 'sql-createindex.html',
      dialogHelp: url_for('help.static', {'filename': 'index_dialog.html'}),
      type: 'index',
      label: gettext('Index'),
      hasSQL:  true,
      hasDepends: true,
      hasStatistics: true,
      width: pgBrowser.stdW.md + 'px',
      statsPrettifyFields: [gettext('Size'), gettext('Index size')],
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_index_on_coll', node: 'coll-index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_index', node: 'index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_index_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_index_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_index_onMatView', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Index...'),
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          nspname: undefined,
          tabname: undefined,
          spcname: undefined,
          amname: 'btree',
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'int', readonly: true, mode: ['properties'],
        },{
          id: 'spcname', label: gettext('Tablespace'), cell: 'string',
          control: 'node-list-by-name', node: 'tablespace',
          select2: {'allowClear': true},
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', filter: function(d) {
            // If tablespace name is not "pg_global" then we need to exclude them
            if(d && d.label.match(/pg_global/))
            {
              return false;
            }
            return true;
          },
        },{
          id: 'amname', label: gettext('Access Method'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', readonly: 'isEditMode', url: 'get_access_methods',
          url_jump_after_node: 'schema',
          group: gettext('Definition'), select2: {'allowClear': true},
          control: Backform.NodeAjaxOptionsControl.extend({
            // When access method changes we need to clear columns collection
            onChange: function() {
              Backform.NodeAjaxOptionsControl.prototype.onChange.apply(this, arguments);
              var self = this,
                // current access method
                current_am = self.model.get('amname'),
                // previous access method
                previous_am = self.model.previous('amname');
              if (current_am != previous_am && self.model.get('columns').length !== 0) {
                var msg = gettext('Changing access method will clear columns collection');
                Alertify.confirm(msg, function () {
                  // User clicks Ok, lets clear collection
                  var column_collection = self.model.get('columns'),
                    col_length = column_collection.length;
                  for (var i=(col_length-1);i>=0;i--) {
                    column_collection.remove(column_collection.models[i]);
                  }
                }, function() {
                  // User clicks Cancel set previous value again in combo box
                  setTimeout(function(){
                    self.model.set('amname', previous_am);
                  }, 10);
                });
              }
            },
          }),
        },{
          id: 'columns_csv', label: gettext('Columns'), cell: 'string',
          type: 'text', disabled: 'inSchema', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'include', label: gettext('Include columns'),
          type: 'array', group: gettext('Definition'),
          editable: false,
          canDelete: true, canAdd: true, mode: ['properties'],
          disabled: 'inSchema', readonly: 'isEditMode',
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 110000)
              return true;

            return false;
          },
          control: Backform.MultiSelectAjaxControl.extend({
            defaults: _.extend(
              {},
              Backform.NodeListByNameControl.prototype.defaults,
              {
                select2: {
                  allowClear: false,
                  width: 'style',
                  multiple: true,
                  placeholder: gettext('Select the column(s)'),
                },
              }
            ),
          }),
          transform : function(data){
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                res.push({label: d.label, value: d.label, image:'icon-column'});
              });
            }
            return res;
          },
          node:'column',
        },{
          id: 'fillfactor', label: gettext('Fill factor'), cell: 'string',
          type: 'int', disabled: 'inSchema', mode: ['create', 'edit', 'properties'],
          min: 10, max:100, group: gettext('Definition'),
        },{
          id: 'indisunique', label: gettext('Unique?'), cell: 'string',
          type: 'switch', disabled: 'inSchema', readonly: 'isEditMode',
          group: gettext('Definition'),
        },{
          id: 'indisclustered', label: gettext('Clustered?'), cell: 'string',
          type: 'switch', disabled: 'inSchema',
          group: gettext('Definition'),
        },{
          id: 'indisvalid', label: gettext('Valid?'), cell: 'string',
          type: 'switch', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'indisprimary', label: gettext('Primary?'), cell: 'string',
          type: 'switch', mode: ['properties'],
          group: gettext('Definition'),
        },{
          id: 'is_sys_idx', label: gettext('System index?'), cell: 'string',
          type: 'switch', mode: ['properties'],
        },{
          id: 'isconcurrent', label: gettext('Concurrent build?'), cell: 'string',
          type: 'switch', disabled: 'inSchema', readonly: 'isEditMode',
          mode: ['create', 'edit'], group: gettext('Definition'),
        },{
          id: 'indconstraint', label: gettext('Constraint'), cell: 'string',
          type: 'text', disabled: 'inSchema', readonly: 'isEditMode', mode: ['create', 'edit'],
          control: 'sql-field', visible: true, group: gettext('Definition'),
        },{
          id: 'columns', label: gettext('Columns'), type: 'collection', deps: ['amname'],
          group: gettext('Definition'), model: ColumnModel, mode: ['edit', 'create'],
          canAdd: function(m) {
            // We will disable it if it's in 'edit' mode
            return m.isNew();
          },
          canEdit: false,
          canDelete: function(m) {
            // We will disable it if it's in 'edit' mode
            return m.isNew();
          },
          control: 'unique-col-collection', uniqueCol : ['colname'],
          columns: ['colname', 'op_class', 'sort_order', 'nulls', 'collspcname'],
        },{
          id: 'include', label: gettext('Include columns'),
          type: 'array', group: gettext('Definition'),
          editable: false,
          canDelete: true, canAdd: true, mode: ['edit', 'create'],
          disabled: 'inSchema', readonly: 'isEditMode',
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 110000)
              return true;

            return false;
          },
          control: Backform.MultiSelectAjaxControl.extend({
            defaults: _.extend(
              {},
              Backform.NodeListByNameControl.prototype.defaults,
              {
                select2: {
                  allowClear: false,
                  width: 'style',
                  multiple: true,
                  placeholder: gettext('Select the column(s)'),
                },
              }
            ),
          }),
          transform : function(data){
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                res.push({label: d.label, value: d.label, image:'icon-column'});
              });
            }
            return res;
          },
          node:'column',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        },
        ],
        validate: function(keys) {
          var msg;

          // Nothing to validate
          if (keys && keys.length == 0) {
            this.errorModel.clear();
            return null;
          } else {
            this.errorModel.clear();
          }

          if (_.isUndefined(this.get('name'))
            || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }
          if (_.isUndefined(this.get('amname'))
            || String(this.get('amname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Access method cannot be empty.');
            this.errorModel.set('amname', msg);
            return msg;
          }
          // Checks if all columns has names
          var cols = this.get('columns');
          if(cols && cols.length > 0) {
            if(!_.every(cols.pluck('colname'))) {
              msg = gettext('You must specify column name.');
              this.errorModel.set('columns', msg);
              return msg;
            }
          } else if(cols){
            msg = gettext('You must specify at least one column.');
            this.errorModel.set('columns', msg);
            return msg;
          }
          return null;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          return false;
        },
        isEditMode: function(m) {
          return !m.isNew();
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's in 'edit' mode
            return !m.isNew();
          }
          return true;
        },
        // Checks weather to enable/disable control
        inSchemaWithColumnCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's system columns
            // ie: it's position is less then 1
            if (m.isNew()) {
              return false;
            } else {
              // if we are in edit mode
              return (_.isUndefined(m.get('attnum')) || m.get('attnum') < 1 );
            }
          }
          return true;
        },
      }),
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [],
          immediate_parent_table_found = false,
          is_immediate_parent_table_partitioned = false,
          s_version = this.getTreeNodeHierarchy(i).server.version;
        // To iterate over tree to check parent node
        while (i) {
          // Do not allow creating index on partitioned tables.
          if (!immediate_parent_table_found &&
            _.indexOf(['table', 'partition'], d._type) > -1) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to create index
          if (_.indexOf(['schema'], d._type) > -1)
            return !is_immediate_parent_table_partitioned;
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // If node is under catalog then do not allow 'create' menu
        if (_.indexOf(parents, 'catalog') > -1) {
          return false;
        } else {
          return !is_immediate_parent_table_partitioned;
        }
      },
    });
  }

  return pgBrowser.Nodes['index'];
});
