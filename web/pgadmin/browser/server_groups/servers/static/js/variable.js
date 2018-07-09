define([
  'sources/gettext', 'underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify',
  'sources/pgadmin', 'pgadmin.browser.node', 'pgadmin.browser.node.ui',
],
  function(gettext, _, $, Backbone, Backform, Backgrid, Alertify, pgAdmin, pgNode) {

    /*
     * cellFunction for variable control.
     * This function returns cell class depending on vartype.
     */
    var cellFunction = function(model) {
      var self = this,
        name = model.get('name'),
        availVariables = {};

      self.collection.each(function(col) {
        if (col.get('name') == 'name') {
          availVariables = col.get('availVariables');
        }
      });

      var variable = name ? availVariables[name]: undefined,
        value = model.get('value');

      switch(variable && variable.vartype) {
      case 'bool':
          /*
           * bool cell and variable cannot be stateless (i.e undefined).
           * It should be either true or false.
           */

        model.set('value', !!model.get('value'), {silent: true});

        return Backgrid.Extension.SwitchCell;
      case 'enum':
        model.set({'value': value}, {silent:true});
        var options = [],
          enumVals = variable.enumvals;

        _.each(enumVals, function(enumVal) {
          options.push([enumVal, enumVal]);
        });

        return Backgrid.Extension.Select2Cell.extend({optionValues: options});
      case 'integer':
        if (!_.isNaN(parseInt(value))) {
          model.set({'value': parseInt(value)}, {silent:true});
        } else {
          model.set({'value': undefined}, {silent:true});
        }
        return Backgrid.IntegerCell;
      case 'real':
        if (!_.isNaN(parseFloat(value))) {
          model.set({'value': parseFloat(value)}, {silent:true});
        } else {
          model.set({'value': undefined}, {silent:true});
        }
        return Backgrid.NumberCell.extend({decimals: 0});
      case 'string':
        return Backgrid.StringCell;
      default:
        model.set({'value': undefined}, {silent:true});
        return Backgrid.Cell;
      }
    };

      /*
       * This row will define behaviour or value column cell depending upon
       * variable name.
       */
    var VariableRow = Backgrid.Row.extend({
      modelDuplicateColor: 'lightYellow',

      modelUniqueColor: '#fff',

      initialize: function () {
        Backgrid.Row.prototype.initialize.apply(this, arguments);
        var self = this;
        self.model.on('change:name', function() {
          setTimeout(function() {
            self.columns.each(function(col) {
              if (col.get('name') == 'value') {

                var idx = self.columns.indexOf(col),
                  cf = col.get('cellFunction'),
                  cell = new (cf.apply(col, [self.model]))({
                    column: col,
                    model: self.model,
                  }),
                  oldCell = self.cells[idx];
                oldCell.remove();
                self.cells[idx] = cell;
                self.render();
              }

            });
          }, 10);
        });
        self.listenTo(self.model, 'pgadmin-session:model:duplicate', self.modelDuplicate);
        self.listenTo(self.model, 'pgadmin-session:model:unique', self.modelUnique);
      },
      modelDuplicate: function() {
        $(this.el).removeClass('new');
        this.el.style.backgroundColor = this.modelDuplicateColor;
      },
      modelUnique: function() {
        this.el.style.backgroundColor = this.modelUniqueColor;
      },

    });
      /**
       *  VariableModel used to represent configuration parameters (variables tab)
       *  for database objects.
       **/
    var VariableModel = pgNode.VariableModel = pgNode.Model.extend({
      keys: ['name'],
      defaults: {
        name: undefined,
        value: undefined,
        role: null,
        database: null,
      },
      schema: [
        {
          id: 'name', label: gettext('Name'), type:'text', cellHeaderClasses: 'width_percent_30',
          editable: function(m) {
            return (m instanceof Backbone.Collection) ? true : m.isNew();
          },
          cell: Backgrid.Extension.NodeAjaxOptionsCell.extend({
            initialize: function() {
              Backgrid.Extension.NodeAjaxOptionsCell.prototype.initialize.apply(this, arguments);

              // Immediately process options as we need them before render.

              var opVals = _.clone(this.optionValues ||
                (_.isFunction(this.column.get('options')) ?
                  (this.column.get('options'))(this) :
                    this.column.get('options')));

              this.column.set('options', opVals);
            },
          }),
          url: 'vopts',
          select2: { allowClear: false },
          transform: function(vars, cell) {
            var res = [],
              availVariables = {};

            _.each(vars, function(v) {
              res.push({
                'value': v.name,
                'image': undefined,
                'label': v.name,
              });
              availVariables[v.name] = v;
            });

            cell.column.set('availVariables', availVariables);
            return res;
          },
        },
        {
          id: 'value', label: gettext('Value'), type: 'text', editable: true,
          cellFunction: cellFunction, cellHeaderClasses: 'width_percent_40',
        },
        {id: 'database', label: gettext('Database'), type: 'text', editable: true,
          node: 'database', cell: Backgrid.Extension.NodeListByNameCell,
        },
        {id: 'role', label: gettext('Role'), type: 'text', editable: true,
          node: 'role', cell: Backgrid.Extension.NodeListByNameCell},
      ],
      toJSON: function() {
        var d = Backbone.Model.prototype.toJSON.apply(this);

        // Remove not defined values from model values.
        // i.e.
        // role, database
        if (_.isUndefined(d.database) || _.isNull(d.database)) {
          delete d.database;
        }

        if (_.isUndefined(d.role) || _.isNull(d.role)) {
          delete d.role;
        }

        return d;
      },
      validate: function() {
        var msg = null;
        if (_.isUndefined(this.get('name')) ||
          _.isNull(this.get('name')) ||
            String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
          msg = gettext('Please select a parameter name.');
          this.errorModel.set('name', msg);
        } else if (_.isUndefined(this.get('value')) ||
              _.isNull(this.get('value')) ||
                String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
          msg = ('Please enter a value for the parameter.');
          this.errorModel.set('value', msg);
          this.errorModel.unset('name');
        } else {
          this.errorModel.unset('name');
          this.errorModel.unset('value');
        }

        return msg;
      },
    });

      /**
       * Variable Tab Control to set/update configuration values for database object.
       *
       **/
    Backform.VariableCollectionControl =
      Backform.UniqueColCollectionControl.extend({

        hasDatabase: false,
        hasRole: false,

        initialize: function(opts) {
          var self = this,
            keys = ['name'];

            /*
             * Read from field schema whether user wants to use database and role
             * fields in Variable control.
             */
          self.hasDatabase = opts.field.get('hasDatabase');
          self.hasRole = opts.field.get('hasRole');

          // Update unique coll field based on above flag status.
          if (self.hasDatabase) {
            keys.push('database');
          } else if (self.hasRole) {
            keys.push('role');
          }
          // Overriding the uniqueCol in the field
          if (opts && opts.field) {
            if (opts.field instanceof Backform.Field) {
              opts.field.set({
                model: pgNode.VariableModel.extend({keys:keys}),
              },
                {
                  silent: true,
                });
            } else {
              opts.field.extend({
                model: pgNode.VariableModel.extend({keys:keys}),
              });
            }
          }

          Backform.UniqueColCollectionControl.prototype.initialize.apply(
            self, arguments
          );

          self.availVariables = {};

          var gridCols = ['name', 'value'];

          if (self.hasDatabase) {
            gridCols.push('database');
          }

          if (self.hasRole) {
            gridCols.push('role');
          }

          self.gridSchema = Backform.generateGridColumnsFromModel(
            self.field.get('node_info'), VariableModel.extend({keys:keys}), 'edit', gridCols, self.field.get('schema_node')
          );

          // Make sure - we do have the data for variables
          self.getVariables();
        },
        /*
         * Get the variable data for this node.
         */
        getVariables: function() {
          var self = this,
            url = this.field.get('url'),
            m = self.model;

          if (!this.field.get('version_compatible'))
            return;

          if (url && !m.isNew()) {
            var node = self.field.get('node'),
              node_data = self.field.get('node_data'),
              node_info = self.field.get('node_info'),
              full_url = node.generate_url.apply(
                node, [
                  null, url, node_data, true, node_info,
                ]),
              data,
              isTracking = self.collection.trackChanges;

            if (isTracking) {
              self.collection.stopSession();
            }
            m.trigger('pgadmin-view:fetching', m, self.field);

            $.ajax({
              async: false,
              url: full_url,
            })
            .done(function (res) {
              data = res.data;
            })
            .fail(function() {
              m.trigger('pgadmin-view:fetch:error', m, self.field);
            });
            m.trigger('pgadmin-view:fetched', m, self.field);

            if (data && _.isArray(data)) {
              self.collection.reset(data, {silent: true});
            }
              /*
               * Make sure - new data will be taken care by the session management
               */
            if (isTracking) {
              self.collection.startNewSession();
            }
          }
        },

        showGridControl: function(data) {

          var self = this,
            titleTmpl = _.template([
              '<div class=\'subnode-header\'>',
              '<label class=\'control-label\'><%-label%></label>',
              '<button class=\'btn-sm btn-default add fa fa-plus\' title=\'' + _('Add new row') + '\' <%=canAdd ? \'\' : \'disabled="disabled"\'%>></button>',
              '</div>'].join('\n')),
            $gridBody =
            $('<div class=\'pgadmin-control-group backgrid form-group col-xs-12 object subnode\'></div>').append(
              titleTmpl(data)
            );

          // Clean up existing grid if any (in case of re-render)
          if (self.grid) {
            self.grid.remove();
          }

          var gridSchema = _.clone(this.gridSchema);

          _.each(gridSchema.columns, function(col) {
            if (col.name == 'value') {
              col.availVariables = self.availVariables;
            }
          });

          // Insert Delete Cell into Grid
          if (data.disabled == false && data.canDelete) {
            gridSchema.columns.unshift({
              name: 'pg-backform-delete', label: '',
              cell: Backgrid.Extension.DeleteCell,
              editable: false, cell_priority: -1,
            });
          }

          // Change format of each of the data
          // Because - data coming from the server is in string format
          self.collection.each(function(model) {
            var name = model.get('name'), val;

            if (name in self.availVariables) {
              switch(self.availVariables[name].vartype) {
              case 'real':
                val = parseFloat(model.get('value'));
                model.set('value', (isNaN(val) ? undefined : val), {silent: true});

                break;
              case 'integer':
                val = parseInt(model.get('value'));
                model.set('value', (isNaN(val) ? undefined : val), {silent: true});

                break;
              default:
                break;
              }
            }
          });

          // Initialize a new Grid instance
          var grid = self.grid = new Backgrid.Grid({
            columns: gridSchema.columns,
            collection: self.collection,
            row: VariableRow,
            className: 'backgrid table-bordered',
          });
          self.$grid = grid.render().$el;

          $gridBody.append(self.$grid);

          // Add button callback
          if (!(data.disabled || data.canAdd == false)) {
            $gridBody.find('button.add').first().on('click',(e) => {
              e.preventDefault();
              var canAddRow = _.isFunction(data.canAddRow) ?
                data.canAddRow.apply(self, [self.model]) : true;
              if (canAddRow) {

                var allowMultipleEmptyRows = !!self.field.get('allowMultipleEmptyRows');

                // If allowMultipleEmptyRows is not set or is false then don't allow second new empty row.
                // There should be only one empty row.
                if (!allowMultipleEmptyRows && self.collection) {
                  var isEmpty = false;
                  self.collection.each(function(model) {
                    var modelValues = [];
                    _.each(model.attributes, function(val) {
                      modelValues.push(val);
                    });
                    if(!_.some(modelValues, _.identity)) {
                      isEmpty = true;
                    }
                  });
                  if(isEmpty) {
                    return false;
                  }
                }

                $(grid.body.$el.find($('tr.new'))).removeClass('new');
                var m = new (data.model) (null, {
                  silent: true,
                  handler: self.collection,
                  top: self.model.top || self.model,
                  collection: self.collection,
                  node_info: self.model.node_info,
                });
                self.collection.add(m);

                var idx = self.collection.indexOf(m),
                  newRow = grid.body.rows[idx].$el;

                newRow.addClass('new');
                $(newRow).pgMakeVisible('backform-tab');

                return false;
              }
            });
          }

          // Render node grid
          return $gridBody;
        },

        addVariable: function(ev) {
          ev.preventDefault();

          var self = this,
            m = new (self.field.get('model'))(
              self.headerData.toJSON(), {
                silent: true, top: self.collection.top,
                handler: self.collection,
              }),
            coll = self.model.get(self.field.get('name'));

          coll.add(m);

          var idx = coll.indexOf(m);

          // idx may not be always > -1 because our UniqueColCollection may
          // remove 'm' if duplicate value found.
          if (idx > -1) {
            self.$grid.find('.new').removeClass('new');

            var newRow = self.grid.body.rows[idx].$el;

            newRow.addClass('new');
            $(newRow).pgMakeVisible('backform-tab');
          }

          return false;
        },
      });

    return VariableModel;
  });
