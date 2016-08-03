define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
        'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  // Extend the browser's node class for index constraint node
  if (!pgBrowser.Nodes['{{node_type}}']) {
    pgAdmin.Browser.Nodes['{{node_type}}'] = pgBrowser.Node.extend({
      type: '{{node_type}}',
      label: '{{ node_label }}',
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      {% if node_type == 'primary_key' %}
      dialogHelp: '{{ url_for('help.static', filename='primary_key_dialog.html') }}',
      {% else %}
      dialogHelp: '{{ url_for('help.static', filename='unique_constraint_dialog.html') }}',
      {% endif %}
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      parent_type: 'table',
      canDrop: true,
      canDropCascade: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_{{node_type}}_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ node_label }}',
          icon: 'wcTabIcon icon-{{node_type}}', data: {action: 'create', check: true},
          enable: 'canCreate'

        }
        ]);
      },
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [];
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1) {
            {% if node_type == 'primary_key' %}
            // There should be only one primary key per table.
            var children = t.children(arguments[1], false),
              primary_key_found = false;

            _.each(children, function(child){
              data = pgBrowser.tree.itemData($(child));
              if (!primary_key_found && data._type == "primary_key") {
                primary_key_found = true;
              }
            });
            return !primary_key_found;
            {% else %}
            return true;
            {% endif %}
          }
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
      },

      // Define the model for index constraint node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          comment: undefined,
          spcname: "pg_default",
          index: undefined,
          fillfactor: undefined,
          condeferrable: undefined,
          condeferred: undefined,
          columns: []
        },

        // Define the schema for the index constraint node
        schema: [{
          id: 'name', label: '{{ _('Name') }}', type: 'text',
          mode: ['properties', 'create', 'edit'], editable:true,
          cellHeaderClasses:'width_percent_40',
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties'], editable: false,
          cellHeaderClasses:'width_percent_20',
        },{
          id: 'comment', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          deps:['name'], disabled:function(m) {
            var name = m.get('name');
            if (!(name && name != '')) {
              setTimeout(function(){
               if(m.get('comment') && m.get('comment') !== '') {
                 m.set('comment', null);
               }
              },10);
              return true;
            } else {
              return false;
            }
          }
        },{
          id: 'columns', label: '{{ _('Columns') }}',
          type: 'collection', group: '{{ _('Definition') }}',
          editable: false,
          cell: Backgrid.StringCell.extend({
            initialize: function() {
              Backgrid.StringCell.prototype.initialize.apply(this, arguments);

              var self = this,
                collection = this.model.get('columns');

               // Do not listen for any event(s) for existing constraint.
              if (_.isUndefined(self.model.get('oid'))) {
                var tableCols = self.model.top.get('columns');
                  self.listenTo(tableCols, 'remove' , self.removeColumn);
                  self.listenTo(tableCols, 'change:name', self.resetColOptions);
              }

              collection.on('pgadmin:multicolumn:updated', function() {
                self.render.apply(self);
              });
              self.listenTo(collection, "add", self.render);
              self.listenTo(collection, "remove", self.render);
            },
            removeColumn: function(m) {
              var self = this,
                  removedCols = self.model.get('columns').where(
                    {column: m.get('name')}
                    );

              self.model.get('columns').remove(removedCols);
              setTimeout(function () {
                self.render();
              }, 10);

              {% if node_type == 'primary_key' %}
                var key = 'primary_key'
              {% else %}
                var key = 'unique_constraint'
              {% endif %}

              setTimeout(function () {
                constraints = self.model.top.get(key);
                var removed = [];
                constraints.each(function(constraint) {
                  if (constraint.get("columns").length == 0) {
                     removed.push(constraint);
                  }
                });
                constraints.remove(removed);
              },100);

            },
            resetColOptions : function(m) {
              var self = this,
                updatedCols = self.model.get('columns').where(
                {column: m.previous('name')}
                );
              if (updatedCols.length > 0) {
                /*
                 * Table column name has changed so update
                 * column name in primary key as well.
                 */
                updatedCols[0].set(
                {"column": m.get('name')},
                {silent: true});
              }

              setTimeout(function () {
                self.render();
              }, 10);
            },
            formatter: {
              fromRaw: function (rawValue, model) {
                return rawValue.pluck("column").toString();
              },
              toRaw: function (val, model) {
                return val;
              }
            },
            render: function() {
              return Backgrid.StringCell.prototype.render.apply(this, arguments);
            },
            remove: function() {
              var tableCols = this.model.top.get('columns'),
              primary_key_col = this.model.get('columns');

              if (primary_key_col) {
                primary_key_col.off('pgadmin:multicolumn:updated');
              }

              this.stopListening(tableCols, 'remove' , self.removeColumn);
              this.stopListening(tableCols, 'change:name' , self.resetColOptions);

              Backgrid.StringCell.prototype.remove.apply(this, arguments);
            }
          }),
          canDelete: true, canAdd: true,
          control: Backform.MultiSelectAjaxControl.extend({
            defaults: _.extend(
              {},
              Backform.NodeListByNameControl.prototype.defaults,
              {
                select2: {
                  multiple: true,
                  allowClear: true,
                  width: 'style',
                  placeholder: '{{ _('Select the column(s)') }}',
                }
              }
            ),
            keyPathAccessor: function(obj, path) {
              var res = obj;
              if(_.isArray(res)) {
                return _.map(res, function(o) { return o['column']
                });
              }
              path = path.split('.');
              for (var i = 0; i < path.length; i++) {
                if (_.isNull(res)) return null;
                if (_.isEmpty(path[i])) continue;
                if (!_.isUndefined(res[path[i]])) res = res[path[i]];
              }
              return _.isObject(res) && !_.isArray(res) ? null : res;
            },
            initialize: function() {
            // Here we will decide if we need to call URL
            // Or fetch the data from parent columns collection
              var self = this;
              if(this.model.handler) {
                Backform.Select2Control.prototype.initialize.apply(this, arguments);
                // Do not listen for any event(s) for existing constraint.
                if (_.isUndefined(self.model.get('oid'))) {
                  var tableCols = self.model.top.get('columns');
                  self.listenTo(tableCols, 'remove' , self.resetColOptions);
                  self.listenTo(tableCols, 'change:name', self.resetColOptions);
                }

                self.custom_options();
              } else {
                Backform.MultiSelectAjaxControl.prototype.initialize.apply(this, arguments);
              }
              self.model.get('columns').on('pgadmin:multicolumn:updated', function() {
                  self.render.apply(self);
                });
            },
            resetColOptions: function(m) {
              var self = this;

              setTimeout(function () {
                self.custom_options();
                self.render.apply(self);
              }, 50);

            },
            custom_options: function() {
              // We will add all the columns entered by user in table model
              var columns = this.model.top.get('columns'),
                added_columns_from_tables = [];

              if (columns.length > 0) {
                _.each(columns.models, function(m) {
                    var col = m.get('name');
                    if(!_.isUndefined(col) && !_.isNull(col)) {
                      added_columns_from_tables.push(
                        {label: col, value: col, image:'icon-column'}
                      );
                    }
                });
              }
              // Set the values in to options so that user can select
              this.field.set('options', added_columns_from_tables);
            },
            onChange: function(e) {
              var self = this,
                  model = this.model,
                  $el = $(e.target),
                  attrArr = this.field.get("name").split('.'),
                  name = attrArr.shift(),
                  path = attrArr.join('.'),
                  vals = this.getValueFromDOM(),
                  collection = model.get(name),
                  removed = [];

              this.stopListening(this.model, "change:" + name, this.render);

              /*
               * Iterate through all the values, and find out how many are already
               * present in the collection.
               */
              collection.each(function(m) {
                  var column = m.get('column'),
                      idx = _.indexOf(vals, column);

                  if (idx > -1) {
                    vals.splice(idx, 1);
                  } else {
                    removed.push(column);
                  }
               });

              /*
               * Adding new values
               */

              _.each(vals, function(v) {
                var m = new (self.field.get('model'))(
                      {column: v}, { silent: true,
                      top: self.model.top,
                      collection: collection,
                      handler: collection
                    });

                collection.add(m);
              });

              /*
               * Removing unwanted!
               */
              _.each(removed, function(v) {
                collection.remove(collection.where({column: v}));
              });

              this.listenTo(this.model, "change:" + name, this.render);
            },
            remove: function() {
              if(this.model.handler) {
                var self = this,
                tableCols = self.model.top.get('columns');
                self.stopListening(tableCols, 'remove' , self.resetColOptions);
                self.stopListening(tableCols, 'change:name' , self.resetColOptions);
                self.model.get('columns').off('pgadmin:multicolumn:updated');

                Backform.Select2Control.prototype.remove.apply(this, arguments);

              } else {
                Backform.MultiSelectAjaxControl.prototype.remove.apply(this, arguments);
              }
            }
          }),
          deps: ['index'], node: 'column',
          model: pgBrowser.Node.Model.extend({
            defaults: {
              column: undefined
            },
            validate: function() {
              return null;
           }
          }),
          transform : function(data){
            var res = [];
            if (data && _.isArray(data)) {
              _.each(data, function(d) {
                res.push({label: d.label, value: d.label, image:'icon-column'});
              })
            }
            return res;
          },
          select2:{allowClear:false},
          disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'top') && !_.isUndefined(m.top)
                                    && !m.top.isNew()) {
                // If OID is undefined then user is trying to add
                // new constraint which should be allowed for Unique
                return !_.isUndefined(m.get('oid'));
            }

            // We can't update columns of existing index constraint.
            if (!m.isNew()) {
                return true;
            }
            // Disable if index is selected.
            var index = m.get('index');
              if(_.isUndefined(index) || index == '') {
                return false;
              } else {
                var col = m.get('columns');
                col.reset();
                return true;
              }
            }
          },{
          id: 'spcname', label: '{{ _('Tablespace') }}',
          type: 'text', group: '{{ _('Definition') }}',
          control: 'node-list-by-name', node: 'tablespace',
          deps: ['index'],
          select2:{allowClear:false},
          filter: function(m) {
            // Don't show pg_global tablespace in selection.
            if (m.label == "pg_global") return false;
            else return true;
          },
          disabled: function(m) {
            // Disable if index is selected.
            m = m.top || m;
            var index = m.get('index');
              if(_.isUndefined(index) || index == '') {
                return false;
              } else {
                setTimeout(function(){
                  m.set('spcname', '');
                },10);
                return true;
              }
          }
        },{
          id: 'index', label: '{{ _('Index') }}',
          type: 'text', group: '{{ _('Definition') }}',
          control: Backform.NodeListByNameControl.extend({
          initialize:function() {
            if (_.isUndefined(this.model.top)) {
              Backform.NodeListByNameControl.prototype.initialize.apply(this,arguments);
            } else {
              Backform.Control.prototype.initialize.apply(this,arguments);
            }
          }
          }),
          select2:{allowClear:true}, node: 'index',
          disabled: function(m) {
            // If we are in table edit mode then disable it
            if (_.has(m, 'top') && !_.isUndefined(m.top)
                                    && !m.top.isNew()) {
                return true;
            }

            // We can't update index of existing index constraint.
            return !m.isNew();
          },
          // We will not show this field in Create Table mode
          visible: function(m) {
            return !_.isUndefined(m.top.node_info['table']);
          }
        },{
          id: 'fillfactor', label: '{{ _('Fill factor') }}', deps: ['index'],
          type: 'int', group: '{{ _('Definition') }}', allowNull: true,
          disabled: function(m) {
            // Disable if index is selected.
            var index = m.get('index');
              if(_.isUndefined(index) || index == '') {
                return false;
              } else {
                setTimeout(function(){
                  m.set('fillfactor', null);
                },10);
                return true;
              }
            }
        },{
          id: 'condeferrable', label: '{{ _('Deferrable?') }}',
          type: 'switch', group: '{{ _('Definition') }}', deps: ['index'],
          disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'top') && !_.isUndefined(m.top)
                                    && !m.top.isNew()) {
                // If OID is undefined then user is trying to add
                // new constraint which should allowed for Unique
                return !_.isUndefined(m.get('oid'));
            }

            // We can't update condeferrable of existing index constraint.
            if (!m.isNew()) {
                return true;
            }
            // Disable if index is selected.
            var index = m.get('index');
            if(_.isUndefined(index) || index == '') {
              return false;
            } else {
              setTimeout(function(){
                if(m.get('condeferrable'))
                  m.set('condeferrable', false);
              },10);
              return true;
            }
          }
        },{
          id: 'condeferred', label: '{{ _('Deferred?') }}',
          type: 'switch', group: '{{ _('Definition') }}',
          deps: ['condeferrable'],
          disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'top') && !_.isUndefined(m.top)
                                    && !m.top.isNew()) {
                // If OID is undefined then user is trying to add
                // new constraint which should allowed for Unique
                return !_.isUndefined(m.get('oid'));
            }

            // We can't update condeferred of existing index constraint.
            if (!m.isNew()) {
              return true;
            }
            // Disable if condeferred is false or unselected.
            if(m.get('condeferrable') == true) {
              return false;
            } else {
              setTimeout(function(){
               if(m.get('condeferred'))
                  m.set('condeferred', false);
              },10);
              return true;
            }
          }
        }
        ],
        validate: function() {
          this.errorModel.clear();
          // Clear parent's error as well
          if (_.has(this, 'top')) {
            this.top.errorModel.clear();
          }

          var columns = this.get('columns'),
            index = this.get('index');

            if ((_.isUndefined(index) || String(index).replace(/^\s+|\s+$/g, '') == '') &&
                (_.isUndefined(columns) || _.isNull(columns) || columns.length < 1)) {
              var msg = '{{ _('Please specify columns for ') }}' + '{{ node_label }}';
              this.errorModel.set('columns', msg);
              return msg;
            }

          return null;
        }
      })
  });
  }

  return pgBrowser.Nodes['{{node_type}}'];
});
