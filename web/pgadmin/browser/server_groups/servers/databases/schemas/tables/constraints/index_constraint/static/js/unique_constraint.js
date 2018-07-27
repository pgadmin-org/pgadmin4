define('pgadmin.node.unique_constraint', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, Backgrid) {

  // Extend the browser's node class for index constraint node
  if (!pgBrowser.Nodes['unique_constraint']) {
    pgAdmin.Browser.Nodes['unique_constraint'] = pgBrowser.Node.extend({
      type: 'unique_constraint',
      label: gettext('Unique constraint'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {filename: 'unique_constraint_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: ['Index size'],
      parent_type: ['table','partition'],
      canDrop: true,
      canDropCascade: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_unique_constraint_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Unique constraint'),
          icon: 'wcTabIcon icon-unique_constraint', data: {action: 'create', check: true},
          enable: 'canCreate',

        },
        ]);
      },
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
          // If table is partitioned table then return false
          if (!immediate_parent_table_found && (d._type == 'table' || d._type == 'partition')) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1) {
            return !is_immediate_parent_table_partitioned;
          }
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

      // Define the model for index constraint node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          comment: undefined,
          spcname: undefined,
          index: undefined,
          fillfactor: undefined,
          condeferrable: undefined,
          condeferred: undefined,
          columns: [],
          include: [],
        },

        // Define the schema for the index constraint node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'], editable:true,
          cellHeaderClasses:'width_percent_40',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'], editable: false,
          cellHeaderClasses:'width_percent_20',
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
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
          },
        },{
          id: 'columns', label: gettext('Columns'),
          type: 'collection', group: gettext('Definition'),
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
              self.listenTo(collection, 'add', self.render);
              self.listenTo(collection, 'remove', self.render);
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

              var key = 'unique_constraint';
              setTimeout(function () {
                var constraints = self.model.top.get(key),
                  removed = [];

                constraints.each(function(constraint) {
                  if (constraint.get('columns').length == 0) {
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
                  {'column': m.get('name')},
                  {silent: true});
              }

              setTimeout(function () {
                self.render();
              }, 10);
            },
            formatter: {
              fromRaw: function (rawValue) {
                return rawValue.pluck('column').toString();
              },
              toRaw: function (val) { return val; },
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
            },
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
                  placeholder: gettext('Select the column(s)'),
                },
              }
            ),
            keyPathAccessor: function(obj, path) {
              var res = obj;
              if(_.isArray(res)) {
                return _.map(res, function(o) { return o['column'];
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
            resetColOptions: function() {
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
            onChange: function() {
              var self = this,
                model = this.model,
                attrArr = this.field.get('name').split('.'),
                name = attrArr.shift(),
                vals = this.getValueFromDOM(),
                collection = model.get(name),
                removed = [];

              this.stopListening(this.model, 'change:' + name, this.render);

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
                    handler: collection,
                  });

                collection.add(m);
              });

                /*
                 * Removing unwanted!
                 */
              _.each(removed, function(v) {
                collection.remove(collection.where({column: v}));
              });

              this.listenTo(this.model, 'change:' + name, this.render);
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
            },
          }),
          deps: ['index'], node: 'column',
          model: pgBrowser.Node.Model.extend({
            defaults: {
              column: undefined,
            },
            validate: function() {
              return null;
            },
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
          },
        },{
          id: 'include', label: gettext('Include columns'),
          type: 'array', group: gettext('Definition'),
          editable: false,
          canDelete: true, canAdd: true, mode: ['properties', 'create', 'edit'],
          visible: function(m) {
            /* In table properties, m.node_info is not available */
            m = m.top;
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
            },
            resetColOptions: function() {
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
          }),
          deps: ['index'], node: 'column',
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
          },
        },{
          id: 'spcname', label: gettext('Tablespace'),
          type: 'text', group: gettext('Definition'),
          control: 'node-list-by-name', node: 'tablespace',
          deps: ['index'],
          select2:{allowClear:false},
          filter: function(m) {
            // Don't show pg_global tablespace in selection.
            if (m.label == 'pg_global') return false;
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
          },
        },{
          id: 'index', label: gettext('Index'),
          type: 'text', group: gettext('Definition'),
          control: Backform.NodeListByNameControl.extend({
            initialize:function() {
              if (_.isUndefined(this.model.top)) {
                Backform.NodeListByNameControl.prototype.initialize.apply(this,arguments);
              } else {
                Backform.Control.prototype.initialize.apply(this,arguments);
              }
            },
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
          },
        },{
          id: 'fillfactor', label: gettext('Fill factor'), deps: ['index'],
          type: 'int', group: gettext('Definition'), allowNull: true,
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
          },
        },{
          id: 'condeferrable', label: gettext('Deferrable?'),
          type: 'switch', group: gettext('Definition'), deps: ['index'],
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
          },
        },{
          id: 'condeferred', label: gettext('Deferred?'),
          type: 'switch', group: gettext('Definition'),
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
          },
        },
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
            var msg = gettext('Please specify columns for %(node)s', {node: gettext('Unique constraint')});
            this.errorModel.set('columns', msg);
            return msg;
          }

          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['unique_constraint'];
});
