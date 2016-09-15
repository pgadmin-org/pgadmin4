define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
        'backform', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, Backform, alertify) {

  if (!pgBrowser.Nodes['coll-index']) {
    var databases = pgAdmin.Browser.Nodes['coll-index'] =
      pgAdmin.Browser.Collection.extend({
        node: 'index',
        label: '{{ _('Indexes') }}',
        type: 'coll-index',
        sqlAlterHelp: 'sql-alterindex.html',
        sqlCreateHelp: 'sql-createindex.html',
        columns: ['name', 'description'],
        hasStatistics: true
      });
  };

  // Node-Ajax-Cell with Deps
  var NodeAjaxOptionsDepsCell = Backgrid.Extension.NodeAjaxOptionsCell.extend({
      initialize: function() {
        Backgrid.Extension.NodeAjaxOptionsCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        var model = this.model,
          column = this.column,
          editable = this.column.get("editable"),
          input = this.$el.find('select').first();

        is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
        if (is_editable) {
           this.$el.addClass("editable");
           input.prop('disabled', false);
         } else {
           this.$el.removeClass("editable");
           input.prop('disabled', true);
         }

        this.delegateEvents();
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove
    });


    // Model to create column collection control
    var ColumnModel = pgAdmin.Browser.Node.Model.extend({
        defaults: {
          colname: undefined,
          collspcname: undefined,
          op_class: undefined,
          sort_order: false,
          nulls: false
        },
        schema: [
          {
            id: 'colname', label:'{{ _('Column') }}', cell: 'node-list-by-name',
            type: 'text', disabled: 'inSchemaWithModelCheck', editable: function(m) {
                // Header cell then skip
                if (m instanceof Backbone.Collection) {
                    return false;
                }
                return !(m.inSchemaWithModelCheck.apply(this, arguments));
            },
            control: 'node-list-by-name', node: 'column'
          },{
            id: 'collspcname', label:'{{ _('Collation') }}',
            cell: NodeAjaxOptionsDepsCell,
            type: 'text', disabled: 'inSchemaWithModelCheck', editable: function(m) {
                // Header cell then skip
                if (m instanceof Backbone.Collection) {
                    return false;
                }
                return !(m.inSchemaWithModelCheck.apply(this, arguments));
            },
            control: 'node-ajax-options', url: 'get_collations', node: 'index'
          },{
            id: 'op_class', label:'{{ _('Operator class') }}',
            cell: NodeAjaxOptionsDepsCell,
            type: 'text', disabled: 'checkAccessMethod',
            editable: function(m) {
                // Header cell then skip
                if (m instanceof Backbone.Collection) {
                    return false;
                }
                return !(m.checkAccessMethod.apply(this, arguments));
            },
            control: 'node-ajax-options', url: 'get_op_class', node: 'index',
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
            }
          },{
            id: 'sort_order', label:'{{ _('Sort order') }}',
            cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
            disabled: 'checkAccessMethod',
            editable: function(m) {
                // Header cell then skip
                if (m instanceof Backbone.Collection) {
                    return false;
                }
                return !(m.checkAccessMethod.apply(this, arguments));
            },
            deps: ['amname'],
            options: {
             'onText': 'DESC', 'offText': 'ASC',
             'onColor': 'success', 'offColor': 'primary',
             'size': 'small'
            }
          },{
            id: 'nulls', label:'{{ _('NULLs') }}',
            cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
            disabled: 'checkAccessMethod',
            editable: function(m) {
                // Header cell then skip
                if (m instanceof Backbone.Collection) {
                    return true;
                }
                return !(m.checkAccessMethod.apply(this, arguments));
            },
            deps: ['amname', 'sort_order'],
            options: {
             'onText': 'FIRST', 'offText': 'LAST',
             'onColor': 'success', 'offColor': 'primary',
             'size': 'small'
            }
          }
        ],
        validate: function() {
          this.errorModel.clear();

          if (_.isUndefined(this.get('colname'))
              || String(this.get('colname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Column Name can not be empty.') }}';
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
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(m.top.node_info &&  'schema' in m.top.node_info) {
            // We will disable control if it's in 'edit' mode
            if (m.top.isNew()) {
              return false;
            } else {
              return true;
            }
          }
          return true;
        },
        // We will check if we are under schema node and added condition
        checkAccessMethod: function(m) {
        //Access method is empty or btree then do not disable field
          var parent_model = m.top;
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              (_.isUndefined(parent_model.get('amname')) ||
               _.isNull(parent_model.get('amname')) ||
               String(parent_model.get('amname')).replace(/^\s+|\s+$/g, '') == '' ||
               parent_model.get('amname') === 'btree')) {
            // We need to set nulls to true if sort_order is set to desc
            // nulls first is default for desc
            if(m.get('sort_order') == true && m.previous('sort_order') ==  false) {
               setTimeout(function() { m.set('nulls', true) }, 10);
            }
            return false;
          }
          return true;
        },
    });

  if (!pgBrowser.Nodes['index']) {
    pgAdmin.Browser.Nodes['index'] = pgAdmin.Browser.Node.extend({
      parent_type: ['table', 'view', 'mview'],
      collection_type: ['coll-table', 'coll-view'],
      sqlAlterHelp: 'sql-alterindex.html',
      sqlCreateHelp: 'sql-createindex.html',
      type: 'index',
      label: '{{ _('Index') }}',
      hasSQL:  true,
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_index_on_coll', node: 'coll-index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Index...') }}',
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_index', node: 'index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Index...') }}',
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_index_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Index...') }}',
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_index_onMatView', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: '{{ _('Index...') }}',
          icon: 'wcTabIcon icon-index', data: {action: 'create', check: true},
          enable: 'canCreate'
        }
        ]);
      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          nspname: undefined,
          tabname: undefined,
          spcname: 'pg_default',
          amname: 'btree'
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: 'inSchema'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'int', disabled: true, mode: ['edit', 'properties']
        },{
          id: 'spcname', label:'{{ _('Tablespace') }}', cell: 'string',
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
          }
        },{
          id: 'amname', label:'{{ _('Access Method') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchemaWithModelCheck', url: 'get_access_methods',
          group: '{{ _('Definition') }}', select2: {'allowClear': true},
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
                var msg = '{{ _('Changing access method will clear columns collection') }}';
                alertify.confirm(msg, function (e) {
                    // User clicks Ok, lets clear collection
                    var column_collection = self.model.get('columns');
                    column_collection.reset();
                  }, function() {
                    // User clicks Cancel set previous value again in combo box
                    setTimeout(function(){
                      self.model.set('amname', previous_am);
                    }, 10);
                });
              }
            }
          })
        },{
          id: 'cols', label:'{{ _('Columns') }}', cell: 'string',
          type: 'text', disabled: 'inSchema', mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'fillfactor', label:'{{ _('Fill factor') }}', cell: 'string',
          type: 'int', disabled: 'inSchema', mode: ['create', 'edit', 'properties'],
          min: 10, max:100, group: '{{ _('Definition') }}'
        },{
          id: 'indisunique', label:'{{ _('Unique?') }}', cell: 'string',
          type: 'switch', disabled: 'inSchemaWithModelCheck',
          group: '{{ _('Definition') }}'
        },{
          id: 'indisclustered', label:'{{ _('Clustered?') }}', cell: 'string',
          type: 'switch', disabled: 'inSchema',
          group: '{{ _('Definition') }}'
        },{
          id: 'indisvalid', label:'{{ _('Valid?') }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'indisprimary', label:'{{ _('Primary?') }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'is_sys_idx', label:'{{ _('System index?') }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties']
        },{
          id: 'isconcurrent', label:'{{ _('Concurrent build?') }}', cell: 'string',
          type: 'switch', disabled: 'inSchemaWithModelCheck',
          mode: ['create', 'edit'], group: '{{ _('Definition') }}'
        },{
          id: 'indconstraint', label:'{{ _('Constraint') }}', cell: 'string',
          type: 'text', disabled: 'inSchemaWithModelCheck', mode: ['create', 'edit'],
          control: 'sql-field', visible: true, group: '{{ _('Definition') }}'
        },{
          id: 'columns', label: 'Columns', type: 'collection', deps: ['amname'],
          group: '{{ _('Definition') }}', model: ColumnModel, mode: ['edit', 'create'],
          canAdd: function(m) {
            // We will disable it if it's in 'edit' mode
            if (m.isNew()) {
              return true;
            } else {
              return false;
            }
          },
          canEdit: false,
          canDelete: function(m) {
            // We will disable it if it's in 'edit' mode
            if (m.isNew()) {
              return true;
            } else {
              return false;
            }
          },
          control: 'unique-col-collection', uniqueCol : ['colname'],
          columns: ['colname', 'op_class', 'sort_order', 'nulls', 'collspcname']
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema'
        }
        ],
        validate: function(keys) {
          var err = {},
              changedAttrs = this.changed,
              msg = undefined;

          // Nothing to validate
          if (keys && keys.length == 0) {
            this.errorModel.clear();
            return null;
          } else {
            this.errorModel.clear();
          }

          if (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Name can not be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }
          if (_.isUndefined(this.get('spcname'))
              || String(this.get('spcname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Tablespace can not be empty.') }}';
            this.errorModel.set('spcname', msg);
            return msg;
          }
          if (_.isUndefined(this.get('amname'))
              || String(this.get('amname')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Access method can not be empty.') }}';
            this.errorModel.set('amname', msg);
            return msg;
          }
          // Checks if all columns has names
          var cols = this.get('columns');
          if(cols && cols.length > 0) {
             if(!_.every(cols.pluck('colname'))) {
               msg = '{{ _('You must specify column name.') }}';
               this.errorModel.set('columns', msg);
               return msg;
             }
          } else if(cols){
               msg = '{{ _('You must specify at least one column.') }}';
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
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's in 'edit' mode
            if (m.isNew()) {
              return false;
            } else {
              return true;
            }
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
              if (!_.isUndefined(m.get('attnum')) && m.get('attnum') >= 1 ) {
                return false;
              } else {
                return true;
              }
           }
          }
          return true;
        }
      }),
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
          // If check is false then , we will allow create menu
          if (data && data.check == false)
            return true;

          var t = pgBrowser.tree, i = item, d = itemData, parents = [];
          // To iterate over tree to check parent node
          while (i) {
            // If it is schema then allow user to c reate table
            if (_.indexOf(['schema'], d._type) > -1)
              return true;
            parents.push(d._type);
            i = t.hasParent(i) ? t.parent(i) : null;
            d = i ? t.itemData(i) : null;
          }
          // If node is under catalog then do not allow 'create' menu
          if (_.indexOf(parents, 'catalog') > -1) {
            return false;
          } else {
            return true;
          }
      }
  });
 }

  return pgBrowser.Nodes['index'];
});
