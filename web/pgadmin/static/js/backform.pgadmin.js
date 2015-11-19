/*
  Backform
  http://github.com/amiliaapp/backform

  Copyright (c) 2014 Amilia Inc.
  Written by Martin Drapeau
  Licensed under the MIT @license
 */
(function(root, factory) {

  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'pgadmin.backgrid'],
     function(_, $, Backbone, Backform, Backgrid) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Backgrid);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform,
      Backgrid = require('backgrid') || root.Backgrid;
      pgAdminBackgrid = require('pgadmin.backgrid');
    factory(root, _, $, Backbone, Backform, Backgrid);

  // Finally, as a browser global.
  } else {
    factory(root, root._, (root.jQuery || root.Zepto || root.ender || root.$), root.Backbone, root.Backform, root.Backgrid);
  }
}(this, function(root, _, $, Backbone, Backform, Backgrid) {

  var pgAdmin = (window.pgAdmin = window.pgAdmin || {});

  pgAdmin.editableCell = function(m) {
    if (this.attributes && this.attributes.disabled) {
      if(_.isFunction(this.attributes.disabled)) {
        return !(this.attributes.disabled.apply(this, [m]));
      }
      if (_.isBoolean(this.attributes.disabled)) {
        return !this.attributes.disabled;
      }
    }
    return true;
  };

  // HTML markup global class names. More can be added by individual controls
  // using _.extend. Look at RadioControl as an example.
  _.extend(Backform, {
    controlLabelClassName: "control-label col-sm-4",
    controlsClassName: "pgadmin-controls col-sm-8",
    groupClassName: "pgadmin-control-group form-group col-xs-12",
    setGroupClassName: "set-group col-xs-12",
    tabClassName: "backform-tab col-xs-12",
    setGroupContentClassName: "fieldset-content col-xs-12"
    });

  var controlMapper = Backform.controlMapper = {
    'int': ['uneditable-input', 'input', 'integer'],
    'text': ['uneditable-input', 'input', 'string'],
    'numeric': ['uneditable-input', 'input', 'number'],
    'date': 'datepicker',
    'boolean': 'boolean',
    'options': ['readonly-option', 'select', Backgrid.Extension.PGSelectCell],
    'multiline': ['textarea', 'textarea', 'string'],
    'collection': ['sub-node-collection', 'sub-node-collection', 'string']
  };

  var getMappedControl = Backform.getMappedControl = function(type, mode) {
    if (type in Backform.controlMapper) {
      var m = Backform.controlMapper[type];

      if (!_.isArray(m)) {
        return m;
      }

      var idx = 1, len = _.size(m);

      switch (mode) {
        case 'properties':
          idx = 0;
          break;
        case 'edit':
        case 'create':
        case 'control':
          idx = 1;
          break;
        case 'cell':
          idx = 2;
          break;
        default:
          idx = 0;
          break;
      }

      return m[idx > len ? 0 : idx];
    }
    alert ("Developer: did you forget to put/implement the control type - '" + type + "' in mapper");
    return null;
  }


  // Override the Backform.Control to allow to track changes in dependencies,
  // and rerender the View element
  var BackformControlInit = Backform.Control.prototype.initialize;
  Backform.Control.prototype.initialize = function() {
    BackformControlInit.apply(this, arguments);

    // Listen to the dependent fields in the model for any change
    var deps = this.field.get('deps');
    var that = this;
    if (deps && _.isArray(deps))
      _.each(deps, function(d) {
        attrArr = d.split('.');
        name = attrArr.shift();
        that.listenTo(that.model, "change:" + name, that.render);
    });
  };
  Backform.Control.prototype.template = _.template([
    '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
    '<div class="<%=Backform.controlsClassName%>">',
    '  <span class="<%=Backform.controlClassName%> uneditable-input" <%=disabled ? "disabled" : ""%>>',
    '    <%=value%>',
    '  </span>',
    '</div>'
  ].join("\n"));

  var ReadonlyOptionControl = Backform.ReadonlyOptionControl = Backform.SelectControl.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '<% for (var i=0; i < options.length; i++) { %>',
      ' <% var option = options[i]; %>',
      ' <% if (option.value === rawValue) { %>',
      ' <span class="<%=Backform.controlClassName%> uneditable-input" disabled><%-option.label%></span>',
      ' <% } %>',
      '<% } %>',
      '</div>'
    ].join("\n")),
    events: {},
    getValueFromDOM: function() {
      return this.formatter.toRaw(this.$el.find("span").text(), this.model);
    }
  });


  // Backform Dialog view (in bootstrap tabbular form)
  // A collection of field models.
  var Dialog = Backform.Dialog = Backform.Form.extend({
    /* Array of objects having attributes [label, fields] */
    schema: undefined,
    tagName: "form",
    className: function() {
      return 'col-sm-12 col-md-12 col-lg-12 col-xs-12';
    },
    tabPanelClassName: function() {
      return Backform.tabClassName;
    },
    initialize: function(opts) {
      var s = opts.schema;
      if (s && _.isArray(s)) {
        this.schema = _.each(s, function(o) {
          if (o.fields && !(o.fields instanceof Backbone.Collection))
            o.fields = new Backform.Fields(o.fields);
          o.cId = o.cId || _.uniqueId('pgC_');
          o.hId = o.hId || _.uniqueId('pgH_');
          o.disabled = o.disabled || false;
        });
        if (opts.tabPanelClassName && _.isFunction(opts.tabPanelClassName)) {
          this.tabPanelClassName = opts.tabPanelClassName;
        }
      }
      this.model.errorModel = opts.errorModel || this.model.errorModel || new Backbone.Model();
      this.controls = [];
    },
    template: {
      'header': _.template([
        '<li role="presentation" <%=disabled ? "disabled" : ""%>>',
        ' <a data-toggle="tab" data-tab-index="<%=tabIndex%>" href="#<%=cId%>"',
        '  id="<%=hId%>" aria-controls="<%=cId%>">',
        '<%=label%></a></li>'].join(" ")),
      'panel': _.template(
        '<div role="tabpanel" class="tab-pane col-sm-12 col-md-12 col-lg-12 col-xs-12 fade" id="<%=cId%>" aria-labelledby="<%=hId%>"></div>'
      )},
    render: function() {
      this.cleanup();

      var c = this.$el
        .children().first().children('.active')
        .first().attr('id'),
        m = this.model,
        controls = this.controls,
        tmpls = this.template,
        self = this,
        idx=1;

      this.$el
          .empty()
          .attr('role', 'tabpanel')
          .attr('class', this.tabPanelClassName());
      m.panelEl = this.$el;

      var tabHead = $('<ul class="nav nav-tabs" role="tablist"></ul>')
        .appendTo(this.$el);
      var tabContent = $('<ul class="tab-content col-sm-12 col-md-12 col-lg-12 col-xs-12"></ul>')
        .appendTo(this.$el);

      _.each(this.schema, function(o) {
        var el = $((tmpls['panel'])(_.extend(o, {'tabIndex': idx++})))
              .appendTo(tabContent)
              .removeClass('collapse').addClass('collapse'),
            h = $((tmpls['header'])(o)).appendTo(tabHead);

        o.fields.each(function(f) {
          var cntr = new (f.get("control")) ({
            field: f,
            model: m
          });
          el.append(cntr.render().$el);
          controls.push(cntr);
        });
        tabHead.find('a[data-toggle="tab"]').on('hidden.bs.tab', function() {
          self.hidden_tab = $(this).data('tabIndex');
        });
        tabHead.find('a[data-toggle="tab"]').on('shown.bs.tab', function() {
          self.shown_tab = $(this).data('tabIndex');
          m.trigger('pg-property-tab-changed', {
            'collection': m.collection, 'model': m,
            'index': m.collection && m.collection.models ? _.indexOf(m.collection.models, m) : 0,
            'shown': self.shown_tab, 'hidden': self.hidden_tab
          });
        });
      });

      var makeActive = tabHead.find('[id="' + c + '"]').first();
      if (makeActive.length == 1) {
        makeActive.parent().addClass('active');
        tabContent.find('#' + makeActive.attr("aria-controls"))
          .addClass('in active');
      } else {
        tabHead.find('[role="presentation"]').first().addClass('active');
        tabContent.find('[role="tabpanel"]').first().addClass('in active');
      }

      return this;
    }
  });

  var Fieldset = Backform.Fieldset = Backform.Dialog.extend({
    template: {
      'header': _.template([
        '<fieldset class="<%=Backform.setGroupClassName%>"<%=disabled ? "disabled" : ""%>>',
        '  <legend class="badge" data-toggle="collapse" data-target="#<%=cId%>"><span class="caret"></span> <%=label%></legend>',
        '  ',
        '</fieldset>'
      ].join("\n")),
      'content': _.template(
        '  <div id="<%= cId %>" class="<%=Backform.setGroupContentClassName%> collapse in"></div>'
    )},
    render: function() {
      this.cleanup();

      var m = this.model,
          $el = this.$el,
          tmpl = this.template,
          controls = this.controls;

      this.$el.empty();

      _.each(this.schema, function(o) {
        if (!o.fields)
          return;

        var h = $((tmpl['header'])(o)).appendTo($el),
          el = $((tmpl['content'])(o))
              .appendTo(h);

        o.fields.each(function(f) {
          var cntr = new (f.get("control")) ({
            field: f,
            model: m
          });
          el.append(cntr.render().$el);
          controls.push(cntr);
        });
      });

      return this;
    },
    getValueFromDOM: function() {
      return "";
    },
    events: {}
  });

  var generateGridColumnsFromModel = Backform.generateGridColumnsFromModel =
    function(node_info, m, type, cols) {
      var groups = Backform.generateViewSchema(node_info, m, type),
      schema = [],
      columns = [],
      addAll = _.isUndefined(cols) || _.isNull(cols);

      // Prepare columns for backgrid
      _.each(groups, function(fields, key) {
        _.each(fields, function(f) {
          if (!f.control && !f.cell) {
            return;
          }
          f.cell_priority = _.indexOf(cols, f.name);
          if (addAll || f.cell_priority != -1) {
            columns.push(f);
          }
        });
        schema.push({label: key, fields: fields});
      });
      return {
        'columns': _.sortBy(columns, function(c) {
          return c.cell_priority;
        }),
        'schema': schema
      };
    };

  var SubNodeCollectionControl =  Backform.SubNodeCollectionControl = Backform.Control.extend({
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
          attributes = this.model.toJSON(),
          attrArr = field.name.split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          rawValue = this.keyPathAccessor(attributes[name], path),
          data = _.extend(field, {
            rawValue: rawValue,
            value: this.formatter.fromRaw(rawValue, this.model),
            attributes: attributes,
            formatter: this.formatter
           }),
          evalF = function(f, m) {
            return (_.isFunction(f) ? !!f(m) : !!f);
          };

      // Evaluate the disabled, visible, required, canAdd, cannEdit & canDelete option
      _.extend(data, {
        disabled: evalF(data.disabled, this.model),
        visible:  evalF(data.visible, this.model),
        required: evalF(data.required, this.model),
        canAdd: evalF(data.canAdd, this.model),
        canEdit: evalF(data.canEdit, this.model),
        canDelete: evalF(data.canDelete, this.model)
      });
      // Show Backgrid Control
      grid = (data.subnode == undefined) ? "" : this.showGridControl(data);

      this.$el.html(grid).addClass(field.name);
      this.updateInvalid();

      return this;
    },
    showGridControl: function(data) {
      var gridHeader = ["<div class='subnode-header'>",
          "  <label class='control-label col-sm-4'>" + data.label + "</label>" ,
          "  <button class='btn-sm btn-default add'>Add</buttton>",
          "</div>"].join("\n");
        gridBody = $("<div class='pgadmin-control-group backgrid form-group col-xs-12 object subnode'></div>").append(gridHeader);

      var subnode = data.subnode.schema ? data.subnode : data.subnode.prototype,
          gridSchema = Backform.generateGridColumnsFromModel(
            data.node_info, subnode, this.field.get('mode'), data.columns
            );

      // Set visibility of Add button
      if (data.disabled || data.canAdd == false) {
        $(gridBody).find("button.add").remove();
      }

      // Insert Delete Cell into Grid
      if (data.disabled == false && data.canDelete) {
          gridSchema.columns.unshift({
            name: "pg-backform-delete", label: "",
            cell: Backgrid.Extension.DeleteCell,
            editable: false, cell_priority: -1
          });
      }

      // Insert Edit Cell into Grid
      if (data.disabled == false && data.canEdit) {
          var editCell = Backgrid.Extension.ObjectCell.extend({
            schema: gridSchema.schema
          });

          gridSchema.columns.unshift({
            name: "pg-backform-edit", label: "", cell : editCell,
            cell_priority: -2
          });
      }

      var collections = this.model.get(data.name);
      // Initialize a new Grid instance
      var grid = new Backgrid.Grid({
          columns: gridSchema.columns,
          collection: collections,
          className: "backgrid table-bordered"
      });

      // Render subNode grid
      subNodeGrid = grid.render().$el;

      // Combine Edit and Delete Cell
      if (data.canDelete && data.canEdit) {
        $(subNodeGrid).find("th.pg-backform-delete").remove();
        $(subNodeGrid).find("th.pg-backform-edit").attr("colspan", "2");
      }

      $dialog =  gridBody.append(subNodeGrid);

      // Add button callback
      $dialog.find('button.add').click(function(e) {
        e.preventDefault();
        grid.insertRow({});
        newRow = $(grid.body.rows[collections.length - 1].$el);
        newRow.attr("class", "new").click(function(e) {
          $(this).attr("class", "");
        });
        return false;
      });

      return $dialog;
    }
  });

  ///////
  // Generate a schema (as group members) based on the model's schema
  //
  // It will be used by the grid, properties, and dialog view generation
  // functions.
  var generateViewSchema = Backform.generateViewSchema = function(node_info, Model, mode) {
    var proto = (Model && Model.prototype) || Model,
        schema = (proto && proto.schema),
        groups, pgBrowser = window.pgAdmin.Browser;

    // 'schema' has the information about how to generate the form.
    if (schema && _.isArray(schema)) {
      var evalASFunc = evalASFunc = function(prop) {
        return ((prop && proto[prop] &&
              typeof proto[prop] == "function") ? proto[prop] : prop);
      };
      groups = {},
      server_info = node_info && ('server' in node_info) &&
        pgBrowser.serverInfo && pgBrowser.serverInfo[node_info.server.id];

      _.each(schema, function(s) {
        // Do we understand - what control, we're creating
        // here?
        if (!s.mode || (s && s.mode && _.isObject(s.mode) &&
          _.indexOf(s.mode, mode) != -1)) {
          // Each field is kept in specified group, or in
          // 'General' category.
          var group = s.group || pgBrowser.messages.general_cateogty,
              control = Backform.getMappedControl(s.type, mode),
              cell =  s.cell || Backform.getMappedControl(s.type, 'cell');

          if (control == null) {
            return;
          }

          // Generate the empty group list (if not exists)
          groups[group] = (groups[group] || []);
          var disabled = ((mode == 'properties') ||
               (server_info &&
                (s.server_type && _.indexOf(server_info.type in s.server_type) == -1) ||
                (s.min_version && s.min_version < server_info.version) ||
                (s.max_version && s.max_version > server_info.version)
               ));

          var o = _.extend(_.clone(s), {
            name: s.id,
            // Do we need to show this control in this mode?
            visible: evalASFunc(s.show),
            // This can be disabled in some cases (if not hidden)

            disabled: (disabled ? true : evalASFunc(s.disabled)),
            editable: (disabled  ? false : pgAdmin.editableCell),
            subnode: ((_.isString(s.model) && s.model in pgBrowser.Nodes) ?
                pgBrowser.Nodes[s.model].model : s.model),
            canAdd: (disabled ? false : evalASFunc(s.canAdd)),
            canEdit: (disabled ? false : evalASFunc(s.canEdit)),
            canDelete: (disabled ? false : evalASFunc(s.canDelete)),
            mode: mode,
            control: control,
            cell: cell,
            node_info: node_info,
          });
          delete o.id;

          // Temporarily store in dictionaly format for
          // utilizing it later.
          groups[group].push(o);
        }
      });

      // Do we have fields to genreate controls, which we
      // understand?
      if (_.isEmpty(groups)) {
        return null;
      }
    }
    return groups;
  }

  return Backform;
}));
