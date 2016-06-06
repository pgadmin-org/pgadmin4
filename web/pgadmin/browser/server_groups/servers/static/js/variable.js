(function(root, factory) {
  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define([
      'underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify',
      'pgadmin', 'pgadmin.browser.node', 'pgadmin.browser.node.ui'
      ],
     function(_, $, Backbone, Backform, Backgrid, Alertify, pgAdmin, pgNode) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Alertify, pgAdmin, pgNode);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform;
      Alertify = require('alertify') || root.Alertify;
      pgAdmin = require('pgadmin') || root.pgAdmin,
      pgNode = require('pgadmin.browser.node') || root.pgAdmin.Browser.Node;
    factory(root, _, $, Backbone, Backform, Alertify, pgAdmin, pgNode);

  // Finally, as a browser global.
  } else {
    factory(
        root, root._, (root.jQuery || root.Zepto || root.ender || root.$),
        root.Backbone, root.Backform, root.pgAdmin.Browser.Node
        );
  }
} (this, function(root, _, $, Backbone, Backform, Alertify, pgAdmin, pgNode) {

  /*
   * cellFunction for variable control.
   * This function returns cell class depending on vartype.
   */
  var cellFunction = function(model) {
    var self = this,
      name = model.get("name"),
      availVariables = self.get('availVariables'),
      variable = availVariables[name];

    switch(variable && variable.vartype) {
      case "bool":
        /*
         * bool cell and variable can not be stateless (i.e undefined).
         * It should be either true or false.
         */
        if (_.isUndefined(model.get("value"))) {
          model.set("value", false);
        }

        return Backgrid.Extension.SwitchCell;
      break;
      case "enum":
        var options = [],
            enumVals = variable.enumvals;

        _.each(enumVals, function(enumVal) {
          options.push([enumVal, enumVal]);
        });

        return Backgrid.Extension.Select2Cell.extend({optionValues: options});
      break;
      case "integer":
        return Backgrid.IntegerCell;
        break;
      case "real":
        return Backgrid.NumberCell.extend({decimals: 0});
      break;
      case "string":
        return Backgrid.StringCell;
      break;
      default:
        return Backgrid.Cell;
      break;
    }
  }

  /**
   *  VariableModel used to represent configuration parameters (variables tab)
   *  for database objects.
   **/
  var VariableModel = pgNode.VariableModel = pgNode.Model.extend({
    defaults: {
      name: undefined,
      value: undefined,
      role: undefined,
      database: undefined,
    },
    keys: ['name', 'role', 'database'],
    schema: [
      {id: 'name', label:'Name', type:'text', editable: false, cellHeaderClasses: 'width_percent_30'},
      {
        id: 'value', label:'Value', type: 'text', editable: true,
        cellFunction: cellFunction, cellHeaderClasses: 'width_percent_50'
      },
      {id: 'database', label:'Database', type: 'text', editable: false},
      {id: 'role', label:'Role', type: 'text', editable: false}
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
      if (_.isUndefined(this.get('value')) ||
          _.isNull(this.get('value')) ||
          String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
        var msg = 'Please enter some value!';

        this.errorModel.set('value', msg);

        return msg;
      } else {
        this.errorModel.unset('value');
      }

      return null;
    }
  });

  /**
   * Variable Tab Control to set/update configuration values for database object.
   *
   **/
  var VariableCollectionControl =  Backform.VariableCollectionControl =
    Backform.UniqueColCollectionControl.extend({

    hasDatabase: false,
    hasRole: false,

    initialize: function(opts) {
      var self = this,
          uniqueCols = ['name'];

      /*
       * Read from field schema whether user wants to use database and role
       * fields in Variable control.
       */
      self.hasDatabase = opts.field.get('hasDatabase');
      self.hasRole = opts.field.get('hasRole');

      // Update unique coll field based on above flag status.
      if (self.hasDatabase) {
        uniqueCols.push('database')
      } else if (self.hasRole) {
        uniqueCols.push('role')
      }
      // Overriding the uniqueCol in the field
      if (opts && opts.field) {
        if (opts.field instanceof Backform.Field) {
          opts.field.set({
            uniqueCol: uniqueCols,
            model: pgNode.VariableModel
          },
          {
            silent: true
          });
        } else {
          opts.field.extend({
            uniqueCol: uniqueCols,
            model: pgNode.VariableModel
          });
        }
      }

      Backform.UniqueColCollectionControl.prototype.initialize.apply(
          self, arguments
          );


      self.availVariables = {};

      var node = self.field.get('node').type,
          headerSchema = [{
            id: 'name', label:'', type:'text',
            url: self.field.get('variable_opts') || 'vopts',
            control: Backform.NodeAjaxOptionsControl,
            cache_level: 'server',
            select2: {
              allowClear: false, width: 'style'
            },
            availVariables: self.availVariables,
            node: node, first_empty: false,
            version_compatible: self.field.get('version_compatible'),
            transform: function(vars) {
              var self = this,
                  opts = self.field.get('availVariables');

              res = [];

              for (var prop in opts) {
                if (opts.hasOwnProperty(prop)) {
                  delete opts[prop];
                }
              }

              _.each(vars, function(v) {
                opts[v.name] = _.extend({}, v);
                res.push({
                  'label': v.name,
                  'value': v.name
                });
              });

              return res;
            }
          }],
          headerDefaults = {name: null},
          gridCols = ['name', 'value'];

      if (self.hasDatabase) {
        headerSchema.push({
          id: 'database', label:'', type: 'text', cache_level: 'server',
          control: Backform.NodeListByNameControl, node: 'database',
          version_compatible: self.field.get('version_compatible')
        });
        headerDefaults['database'] = null;
        gridCols.push('database');
      }

      if (self.hasRole) {
        headerSchema.push({
          id: 'role', label:'', type: 'text', cache_level: 'server',
          control: Backform.NodeListByNameControl, node: 'role',
          version_compatible: self.field.get('version_compatible')
        });
        headerDefaults['role'] = null;
        gridCols.push('role');
      }

      self.headerData = new (Backbone.Model.extend({
        defaults: headerDefaults,
        schema: headerSchema
      }))({});

      var headerGroups = Backform.generateViewSchema(
          self.field.get('node_info'), self.headerData, 'create',
          node, self.field.get('node_data')
          ),
          fields = [];

      _.each(headerGroups, function(o) {
        fields = fields.concat(o.fields);
      });

      self.headerFields = new Backform.Fields(fields);
      self.gridSchema = Backform.generateGridColumnsFromModel(
          null, VariableModel, 'edit', gridCols
          );

      // Make sure - we do have the data for variables
      self.getVariables();

      self.controls = [];
      self.listenTo(self.headerData, "change", self.headerDataChanged);
      self.listenTo(self.headerData, "select2", self.headerDataChanged);
      self.listenTo(self.collection, "remove", self.onRemoveVariable);
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
                null, url, node_data, true, node_info
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
          success: function (res) {
            data = res.data;
          },
          error: function() {
            m.trigger('pgadmin-view:fetch:error', m, self.field);
          }
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

    generateHeader: function(data) {
      var header = [
        '<div class="subnode-header-form">',
        ' <div class="container-fluid">',
        '  <div class="row">',
        '   <div class="col-md-4">',
        '    <label class="control-label"><%-variable_label%></label>',
        '   </div>',
        '   <div class="col-md-4" header="name"></div>',
        '   <div class="col-md-4">',
        '     <button class="btn-sm btn-default add" <%=canAdd ? "" : "disabled=\'disabled\'"%> ><%-add_label%></buttton>',
        '   </div>',
        '  </div>'];

      if(this.hasDatabase) {
        header.push([
          '  <div class="row">',
          '   <div class="col-md-4">',
          '    <label class="control-label"><%-database_label%></label>',
          '   </div>',
          '   <div class="col-md-4" header="database"></div>',
          '  </div>'].join("\n")
          );
      }

      if (this.hasRole) {
        header.push([
          '  <div class="row">',
          '   <div class="col-md-4">',
          '    <label class="control-label"><%-role_label%></label>',
          '   </div>',
          '   <div class="col-md-4" header="role"></div>',
          '  </div>'].join("\n")
          );
      }

      header.push([
          ' </div>',
          '</div>'].join("\n"));

      // TODO:: Do the i18n
      _.extend(data, {
        variable_label: "Parameter name",
        add_label: "ADD",
        database_label: "Database",
        role_label: "Role"
      });

      var self = this,
          headerTmpl = _.template(header.join("\n")),
          $header = $(headerTmpl(data)),
          controls = this.controls;

      this.headerFields.each(function(field) {
        var control = new (field.get("control"))({
          field: field,
          model: self.headerData
        });

        $header.find('div[header="' + field.get('name') + '"]').append(
          control.render().$el
        );

        controls.push(control);
      });

      // We should not show add but in properties mode
      if (data.mode == 'properties') {
        $header.find("button.add").remove();
      }

      self.$header = $header;

      return $header;
    },

    events: _.extend(
                {}, Backform.UniqueColCollectionControl.prototype.events,
                {'click button.add': 'addVariable'}
                ),

    showGridControl: function(data) {

      var self = this,
          titleTmpl = _.template([
            "<div class='subnode-header'>",
            "<label class='control-label'><%-label%></label>",
            "</div>"].join("\n")),
          $gridBody =
            $("<div class='pgadmin-control-group backgrid form-group col-xs-12 object subnode'></div>").append(
              titleTmpl({label: data.label})
            );

      $gridBody.append(self.generateHeader(data));

      var gridSchema = _.clone(this.gridSchema);

      _.each(gridSchema.columns, function(col) {
        if (col.name == 'value') {
          col.availVariables = self.availVariables;
        }
      });

      // Insert Delete Cell into Grid
      if (data.disabled == false && data.canDelete) {
          gridSchema.columns.unshift({
            name: "pg-backform-delete", label: "",
            cell: Backgrid.Extension.DeleteCell,
            editable: false, cell_priority: -1
          });
      }

      // Change format of each of the data
      // Because - data coming from the server is in string format
      self.collection.each(function(model) {
        var name = model.get("name");

        if (name in self.availVariables) {
          switch(self.availVariables[name].vartype) {
            case 'real':
              var v = parseFloat(model.get('value'));
              model.set('value', (isNaN(v) ? undefined : v), {silent: true});

              break;
            case 'integer':
              var v = parseInt(model.get('value'));
              model.set('value', (isNaN(v) ? undefined : v), {silent: true});

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
        className: "backgrid table-bordered"
      });
      self.$grid = grid.render().$el;

      $gridBody.append(self.$grid);

      self.headerData.set(
          'name',
          self.$header.find(
            'div[header="name"] select option:first'
            ).val()
          );

      // Render node grid
      return $gridBody;
    },

    addVariable: function(ev) {
      ev.preventDefault();

      var self = this,
          m = new (self.field.get('model'))(
                self.headerData.toJSON(), {
                  silent: true, top: self.collection.top,
                  handler: self.collection
                }),
          coll = self.model.get(self.field.get('name'));

      coll.add(m);

      var idx = coll.indexOf(m);

      // idx may not be always > -1 because our UniqueColCollection may
      // remove 'm' if duplicate value found.
      if (idx > -1) {
        self.$grid.find('.new').removeClass('new');

        var newRow = self.grid.body.rows[idx].$el;

        newRow.addClass("new");
        $(newRow).pgMakeVisible('backform-tab');
      } else {
        delete m;
      }

      this.headerDataChanged();

      return false;
    },

    headerDataChanged: function() {
      var self = this, val,
          data = this.headerData.toJSON(),
          inSelected = false,
          checkVars = ['name'];

      if (!self.$header) {
        return;
      }

      if (self.hasDatabase) {
        checkVars.push('database');
      }

      if (self.hasRole) {
        checkVars.push('role');
      }

      if (self.control_data.canAdd) {
        self.collection.each(function(m) {
          if (!inSelected) {
            var has = true;
            _.each(checkVars, function(v) {
              val = m.get(v);
              has = has && ((
                (_.isUndefined(val) || _.isNull(val)) &&
                (_.isUndefined(data[v]) || _.isNull(data[v]))
                ) ||
                (val == data[v]));
            });

            inSelected = has;
          }
        });
      }
      else {
        inSelected = true;
      }

      self.$header.find('button.add').prop('disabled', inSelected);
    },

    onRemoveVariable: function() {
      var self = this;

      // Wait for collection to be updated before checking for the button to be
      // enabled, or not.
      setTimeout(function() {
        self.headerDataChanged();
      }, 10);
    },

    remove: function() {
      /*
       * Stop listening the events registered by this control.
       */
      this.stopListening(this.headerData, "change", this.headerDataChanged);
      this.listenTo(this.headerData, "select2", this.headerDataChanged);
      this.listenTo(this.collection, "remove", this.onRemoveVariable);

      // Remove header controls.
      _.each(this.controls, function(control) {
        control.remove();
      });

      VariableCollectionControl.__super__.remove.apply(this, arguments);

      // Remove the header model
      delete (this.headerData);

      // Clear the available Variables object
      self.availVariables = {};
    }
  });

  return VariableModel;
}));
