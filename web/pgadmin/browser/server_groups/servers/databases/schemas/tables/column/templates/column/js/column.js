define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
        'backform', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, Backform, alertify) {

  if (!pgBrowser.Nodes['coll-column']) {
    var databases = pgBrowser.Nodes['coll-column'] =
      pgBrowser.Collection.extend({
        node: 'column',
        label: '{{ _('Columns') }}',
        type: 'coll-column',
        columns: ['name', 'atttypid', 'description']
      });
  };

   // This Node model will be used for variable control for column
   var VariablesModel = Backform.VariablesModel = pgBrowser.Node.Model.extend({
    defaults: {
      name: null,
      value: null
    },
    schema: [{
      id: 'name', label: '{{ _('Name') }}', cell: 'select2',
      type: 'text', disabled: false, node: 'column',
      options: [['n_distinct', 'n_distinct'],
      ['n_distinct_inherited','n_distinct_inherited']],
      select2: {placeholder: "Select variable"},
      cellHeaderClasses:'width_percent_50'
    },{
      id: 'value', label: '{{ _('Value') }}',
      type: 'text', disabled: false,
      cellHeaderClasses:'width_percent_50'
    }],
    validate: function() {
      var err = {},
          errmsg = null;

      if (_.isUndefined(this.get('value')) ||
        _.isNull(this.get('value')) ||
        String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
            errmsg =  '{{ _('Please provide input for variable.')}}';
            this.errorModel.set('value', errmsg);
            return errmsg;
          } else {
            this.errorModel.unset('value');
          }
      return null;
    }
  });

  // Integer Cell for Columns Length and Precision
  var IntegerDepCell = Backgrid.Extension.IntegerDepCell =
    Backgrid.IntegerCell.extend({
      initialize: function() {
        Backgrid.NumberCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        this.$el.empty();
        var model = this.model,
            column = this.column,
            editable = this.column.get("editable"),
            is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;

        if (is_editable){ this.$el.addClass("editable"); }
        else { this.$el.removeClass("editable"); }

        this.delegateEvents();
        return this;
      },
      render: function() {
        Backgrid.NumberCell.prototype.render.apply(this, arguments);

        var model = this.model,
            column = this.column,
            editable = this.column.get("editable"),
            is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;

        if (is_editable){ this.$el.addClass("editable"); }
        else { this.$el.removeClass("editable"); }
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove
    });

  if (!pgBrowser.Nodes['column']) {
    pgBrowser.Nodes['column'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'mview'],
      collection_type: ['coll-table', 'coll-view', 'coll-mview'],
      type: 'column',
      label: '{{ _('Column') }}',
      hasSQL:  true,
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-altertable.html',
      dialogHelp: '{{ url_for('help.static', filename='column_dialog.html') }}',
      canDrop: function(itemData, item, data){
        if (pgBrowser.Nodes['schema'].canChildDrop.apply(this, [itemData, item, data])) {
          var t = pgBrowser.tree, i = item, d = itemData, parents = [];
          // To iterate over tree to check parent node
          while (i) {
            parents.push(d._type);
            i = t.hasParent(i) ? t.parent(i) : null;
            d = i ? t.itemData(i) : null;
          }

          // Check if menu is allowed ?
          if(_.indexOf(parents, 'catalog') > -1 ||
             _.indexOf(parents, 'view') > -1 ||
             _.indexOf(parents, 'mview') > -1) {
            return false;
          } else if(_.indexOf(parents, 'table') > -1) {
            return true;
          }
        } else {
          return false;
        }
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
          category: 'create', priority: 4, label: '{{ _('Column...') }}',
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_column', node: 'column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Column...') }}',
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_column_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Column...') }}',
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_column_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Column...') }}',
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate'
        }
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
          min_val: undefined,
          max_val: undefined,
          edit_types: undefined,
          is_primary_key: false,
          inheritedfrom: undefined,
          attstattarget:undefined,
          attnotnull: false,
          attlen: null,
          attprecision: null
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: 'inSchemaWithColumnCheck',
          cellHeaderClasses:'width_percent_30',
          editable: 'editable_check_for_table'
        },{
          // Need to show this field only when creating new table
          // [in SubNode control]
          id: 'is_primary_key', label: '{{ _('Primary key?') }}',
          cell: Backgrid.Extension.TableChildSwitchCell, type: 'switch',
          deps:['name'], cellHeaderClasses:'width_percent_5',
          options: {
            onText: '{{ _("Yes") }}', offText: '{{ _("No") }}',
            onColor: 'success', offColor: 'primary'
          },
          visible: function(m) {
            return _.isUndefined(
              m.top.node_info['table'] || m.top.node_info['view'] ||
                m.top.node_info['mview']
            );
          },
          disabled: function(m){
            // If primary key already exist then disable.
            if (
              m.top && !_.isUndefined(m.top.get('oid')) &&
                m.top.get('primary_key').length > 0 &&
                !_.isUndefined(m.top.get('primary_key').first().get('oid'))
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
          editable: function(m){
            var name = m.get('name');
            // If HeaderCell then allow True
            if(m instanceof Backbone.Collection) {
              return true;
            }
            // If primary key already exist then disable.
            if (m.top && !_.isUndefined(m.top.get('oid')) &&
                      m.top.get('primary_key').length > 0 &&
                      !_.isUndefined(m.top.get('primary_key').first().get('oid'))) {

              return false;
            }

            if(!m.inSchemaWithColumnCheck.apply(this, [m]) &&
              !_.isUndefined(name) && !_.isNull(name) && name !== '') {
              return true;
            }
            return false;
            // Set to false if no condition is met
            m.set('is_primary_key', false);
          }
        },{
          id: 'attnum', label:'{{ _('Position') }}', cell: 'string',
          type: 'text', disabled: 'notInSchema', mode: ['properties']
        },{
          id: 'cltype', label:'{{ _('Data type') }}',
          cell: Backgrid.Extension.NodeAjaxOptionsCell.extend({
            exitEditMode: function(e) {
                var self = this;
                this.$select.off('blur', this.exitEditMode);
                this.$select.select2('close');
                this.$el.removeClass('editor');
                // Once user have selected a value
                // we can shift to next cell if it is editable
                var el_length_cell = this.$el.next();
                // Add delay so that Select2 cell tab event is captured
                // first before triggerring backgrid:edited event.
                setTimeout(function() {
                  if(el_length_cell && el_length_cell.hasClass('editable') && e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var command = new Backgrid.Command({key: "Tab", keyCode: 9, which: 9});
                    self.model.trigger("backgrid:edited", self.model, self.column,
                                      command);
                    el_length_cell.focus();
                  }
                }, 20);
            }
          }),
          type: 'text', disabled: 'inSchemaWithColumnCheck',
          control: 'node-ajax-options', url: 'get_types', node: 'table',
          cellHeaderClasses:'width_percent_30', first_empty: true,
          select2: { allowClear: false }, group: '{{ _('Definition') }}',
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
          editable: 'editable_check_for_table'
        },{
          // Need to show this field only when creating new table [in SubNode control]
          id: 'inheritedfrom', label: '{{ _('Inherited from table') }}',
          type: 'text', disabled: true, editable: false,
          cellHeaderClasses:'width_percent_10',
          visible: function(m) {
            return _.isUndefined(m.top.node_info['table'] || m.top.node_info['view'] || m.top.node_info['mview']);
          }
        },{
          id: 'attlen', label:'{{ _('Length') }}', cell: IntegerDepCell,
           deps: ['cltype'], type: 'int', group: '{{ _('Definition') }}', cellHeaderClasses:'width_percent_20',
           disabled: function(m) {
             var of_type = m.get('cltype'),
               flag = true;
              _.each(m.datatypes, function(o) {
                if ( of_type == o.value ) {
                    if(o.length)
                    {
                      m.set('min_val', o.min_val, {silent: true});
                      m.set('max_val', o.max_val, {silent: true});
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
                   m.set('min_val', o.min_val, {silent: true});
                   m.set('max_val', o.max_val, {silent: true});
                   flag = true;
                 }
                }
              });

              !flag && setTimeout(function() {
                  if(m.get('attlen')) {
                    m.set('attlen', null);
                  }
                },10);

              return flag;
           }
        },{
          id: 'attprecision', label:'{{ _('Precision') }}', cell: IntegerDepCell,
           deps: ['cltype'], type: 'int', group: '{{ _('Definition') }}', cellHeaderClasses:'width_percent_20',
           disabled: function(m) {
             var of_type = m.get('cltype'),
               flag = true;
              _.each(m.datatypes, function(o) {
                if ( of_type == o.value ) {
                  if(o.precision) {
                    m.set('min_val', o.min_val, {silent: true});
                    m.set('max_val', o.max_val, {silent: true});
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
                    m.set('min_val', o.min_val, {silent: true});
                    m.set('max_val', o.max_val, {silent: true});
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
           }
         },{
          id: 'collspcname', label:'{{ _('Collation') }}', cell: 'string',
          type: 'text', control: 'node-ajax-options', url: 'get_collations',
          group: '{{ _('Definition') }}', node: 'collation',
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
                    m.set('collspcname', "");
                  }
                }, 10);
             }
             return flag;
          }
        },{
          id: 'defval', label:'{{ _('Default Value') }}', cell: 'string',
          type: 'text', group: '{{ _('Definition') }}', deps: ['cltype'],
          disabled: function(m) {
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
              var type = m.get('cltype');
                return type == 'serial' || type == 'bigserial'
                                        || type == 'smallserial';
            }
          }
        },{
          id: 'attnotnull', label:'{{ _('Not NULL?') }}', cell: 'switch',
          type: 'switch', disabled: 'inSchemaWithColumnCheck', cellHeaderClasses:'width_percent_20',
          group: '{{ _('Definition') }}', editable: 'editable_check_for_table',
          options: { onText: 'Yes', offText: 'No', onColor: 'success', offColor: 'primary' }
        },{
          id: 'attstattarget', label:'{{ _('Statistics') }}', cell: 'string',
          type: 'text', disabled: 'inSchemaWithColumnCheck', mode: ['properties', 'edit'],
          group: '{{ _('Definition') }}'
        },{
          id: 'attstorage', label:'{{ _('Storage') }}', group: '{{ _('Definition') }}',
          type: 'text', mode: ['properties', 'edit'],
          cell: 'string', disabled: 'inSchemaWithColumnCheck', first_empty: true,
          control: 'select2', select2: { placeholder: "Select storage",
            allowClear: false,
            width: "100%"
          },
          options: [
            {label: "PLAIN", value: "p"},
            {label: "MAIN", value: "m"},
            {label: "EXTERNAL", value: "e"},
            {label: "EXTENDED", value: "x"},
           ]
        },{
          id: 'is_pk', label:'{{ _('Primary key?') }}',
          type: 'switch', disabled: true, mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'is_fk', label:'{{ _('Foreign key?') }}',
          type: 'switch', disabled: true, mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'is_inherited', label:'{{ _('Inherited?') }}',
          type: 'switch', disabled: true, mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'tbls_inherited', label:'{{ _('Inherited from table(s)') }}',
          type: 'text', disabled: true, mode: ['properties'], deps: ['is_inherited'],
          group: '{{ _('Definition') }}',
          visible: function(m) {
              if (!_.isUndefined(m.get('is_inherited')) && m.get('is_inherited')) {
                return true;
              } else {
                return false;
              }
          }
        },{
          id: 'is_sys_column', label:'{{ _('System column?') }}', cell: 'string',
          type: 'switch', disabled: true, mode: ['properties']
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'notInSchema'
        },{
          id: 'attoptions', label: 'Variables', type: 'collection',
          group: '{{ _('Variables') }}', control: 'unique-col-collection',
          model: VariablesModel, uniqueCol : ['name'],
          mode: ['edit', 'create'], canAdd: true, canEdit: false,
          canDelete: true
        }, pgBrowser.SecurityGroupUnderSchema, {
          id: 'attacl', label: 'Privileges', type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
          privileges: ['a','r','w','x']}),
          mode: ['edit'], canAdd: true, canDelete: true,
          uniqueCol : ['grantee']
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}', canAdd: true,
          model: pgBrowser.SecLabelModel, group: 'security',
          mode: ['edit', 'create'], editable: false, type: 'collection',
          min_version: 90100, canEdit: false, canDelete: true,
          control: 'unique-col-collection'
        }],
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
            msg = '{{ _('Column name can not be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          if (_.isUndefined(this.get('cltype'))
              || String(this.get('cltype')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Column type can not be empty.') }}';
            this.errorModel.set('cltype', msg);
            return msg;
          }

          if (!_.isUndefined(this.get('cltype'))
                && !_.isUndefined(this.get('attlen'))
                && !_.isNull(this.get('attlen'))
                && this.get('attlen') !== '') {
            // Validation for Length field
            if (this.get('attlen') < this.get('min_val'))
              msg = '{{ _('Length should not be less than: ') }}' + this.get('min_val');
            if (this.get('attlen') > this.get('max_val'))
              msg = '{{ _('Length should not be greater than: ') }}' + this.get('max_val');
            // If we have any error set then throw it to user
            if(msg) {
              this.errorModel.set('attlen', msg)
              return msg;
            }
          }

          if (!_.isUndefined(this.get('cltype'))
                && !_.isUndefined(this.get('attprecision'))
                && !_.isNull(this.get('attprecision'))
                && this.get('attprecision') !== '') {
            // Validation for precision field
            if (this.get('attprecision') < this.get('min_val'))
              msg = '{{ _('Precision should not be less than: ') }}' + this.get('min_val');
            if (this.get('attprecision') > this.get('max_val'))
              msg = '{{ _('Precision should not be greater than: ') }}' + this.get('max_val');
            // If we have any error set then throw it to user
            if(msg) {
              this.errorModel.set('attprecision', msg)
              return msg;
            }
          }

          return null;
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
            if (!_.isUndefined(m.get('attnum')) && m.get('attnum') > 0 ) {
              return false;
            } else {
              return true;
            }
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
          if (_.indexOf(parents, 'catalog') > -1 ||
              _.indexOf(parents, 'coll-view') > -1 ||
              _.indexOf(parents, 'coll-mview') > -1 ||
              _.indexOf(parents, 'mview') > -1 ||
              _.indexOf(parents, 'view') > -1) {
            return false;
          } else {
            return true;
          }
      }
    });
  }

  return pgBrowser.Nodes['column'];
});
