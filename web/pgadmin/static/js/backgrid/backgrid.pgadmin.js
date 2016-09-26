(function(root, factory) {
  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define([
      'underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify',
      'moment', 'bootstrap.datetimepicker'
    ],
     function(_, $, Backbone, Backform, Backgrid, Alertify, moment) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Alertify, moment);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform;
      Alertify = require('alertify') || root.Alertify;
      moment = require('moment') || root.moment;
    factory(root, _, $, Backbone, Backform, Alertify, moment);

  // Finally, as a browser global.
  } else {
    factory(root, root._, (root.jQuery || root.Zepto || root.ender || root.$), root.Backbone, root.Backform);
  }
} (this, function(root, _, $, Backbone, Backform, Alertify, moment) {
  /*
     * Add mechanism in backgrid to render different types of cells in
     * same column;
   */

  // Add new property cellFunction in Backgrid.Column.
  _.extend(Backgrid.Column.prototype.defaults, { cellFunction: undefined });

  // Add tooltip to cell if cell content is larger than
  // cell width
  _.extend(Backgrid.Cell.prototype.events, {
    'mouseover': function(e) {
      var $el = $(this.el);
      if($el.text().length > 0 && !$el.attr('title') &&
        ($el.innerWidth() + 1) < $el[0].scrollWidth
      ) {
        $el.attr('title', $.trim($el.text()));
      }
    }
  });

  _.extend(Backgrid.Row.prototype, {
    makeCell: function (column) {
      return new (this.getCell(column))({
        column: column,
        model: this.model
      });
    },
    /*
     * getCell function will check and execute user given cellFunction to get
     * appropriate cell class for current cell being rendered.
     * User provided cellFunction must return valid cell class.
     * cellFunction will be called with context (this) as column and model as
     * argument.
     */
    getCell: function (column) {
      var cf = column.get("cellFunction");
      if (_.isFunction(cf)){
        var cell = cf.apply(column, [this.model]);
        try {
          return Backgrid.resolveNameToClass(cell, "Cell");
        } catch (e) {
          if (e instanceof ReferenceError) {
            // Fallback to column cell.
            return column.get("cell");
          } else {
            throw e; // Let other exceptions bubble up
          }
        }
      } else {
        return column.get("cell");
      }
    }
  });

  var ObjectCellEditor = Backgrid.Extension.ObjectCellEditor = Backgrid.CellEditor.extend({
    modalTemplate: _.template([
      '<div class="subnode-dialog" tabindex="1">',
      '    <div class="subnode-body"></div>',
      '</div>'
    ].join("\n")),
    stringTemplate: _.template([
      '<div class="form-group">',
      '  <label class="control-label col-sm-4"><%=label%></label>',
      '  <div class="col-sm-8">',
      '    <input type="text" class="form-control" name="<%=name%>" value="<%=value%>" placeholder="<%=placeholder%>" />',
      '  </div>',
      '</div>'
    ].join("\n")),
    extendWithOptions: function(options) {
      _.extend(this, options);
    },
    render: function () {
      return this;
    },
    postRender: function(model, column) {
      var editor = this,
          el = this.el;
          columns_length = this.columns_length;

      if (column != null && column.get("name") != this.column.get("name"))
        return false;

      if (!_.isArray(this.schema)) throw new TypeError("schema must be an array");

      // Create a Backbone model from our object if it does not exist
      var $dialog = this.createDialog(columns_length);

      // Add the Bootstrap form
      var $form = $('<form class="form-dialog"></form>');
      $dialog.find('div.subnode-body').append($form);

      // Call Backform to prepare dialog
      back_el = $dialog.find('form.form-dialog');

      this.objectView = new Backform.Dialog({
        el: back_el, model: this.model, schema: this.schema,
        tabPanelClassName: function() {
          return 'sub-node-form col-sm-12';
        }
      });

      this.objectView.render();

      return this;
    },
    createDialog: function(noofcol) {
      var $dialog = this.$dialog = $(this.modalTemplate({title: ""})),
          tr = $("<tr>"),
          noofcol = noofcol || 1,
          td = $("<td>", {class: 'editable sortable renderable', style: 'height: auto', colspan: noofcol+2}).appendTo(tr);

      this.tr = tr;

      // Show the Bootstrap modal dialog
      td.append($dialog.css('display', 'block'));
      this.el.parent('tr').after(tr);

      return $dialog;
    },
    save: function() {
      // Retrieve values from the form, and store inside the object model
      this.model.trigger("backgrid:edited", this.model, this.column, new Backgrid.Command({keyCode:13}));
      if (this.tr) {
        this.tr.remove();
      }

      return this;
    },
    remove: function() {
      this.objectView.remove();
      Backgrid.CellEditor.prototype.remove.apply(this, arguments);
      if (this.tr) {
        this.tr.remove();
      }
      return this;
    }
  });

  var PGSelectCell = Backgrid.Extension.PGSelectCell = Backgrid.SelectCell.extend({
    // It's possible to render an option group or use a
    // function to provide option values too.
    optionValues: function() {
      var res = [];
          opts = _.result(this.column.attributes, 'options');
      _.each(opts, function(o) {
        res.push([o.label, o.value]);
      });
      return res;
    }
  });

  var ObjectCell = Backgrid.Extension.ObjectCell = Backgrid.Cell.extend({
    editorOptionDefaults: {
      schema: []
    },
    className: "edit-cell",
    editor: ObjectCellEditor,
    initialize: function(options) {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);

      // Pass on cell options to the editor
      var cell = this,
          editorOptions = {};
      _.each(this.editorOptionDefaults, function(def, opt) {
        if (!cell[opt]) cell[opt] = def;
        if (options && options[opt]) cell[opt] = options[opt];
        editorOptions[opt] = cell[opt];
      });

      editorOptions['el'] = $(this.el);
      editorOptions['columns_length'] = this.column.collection.length;
      editorOptions['el'].attr('tabindex' , 1);

      this.listenTo(this.model, "backgrid:edit", function (model, column, cell, editor) {
        if (column.get("name") == this.column.get("name"))
          editor.extendWithOptions(editorOptions);
      });
    },
    enterEditMode: function () {
      // Notify that we are about to enter in edit mode for current cell.
     // We will check if this row is editable first
      var canEditRow = (!_.isUndefined(this.column.get('canEditRow')) &&
                          _.isFunction(this.column.get('canEditRow'))) ?
                          Backgrid.callByNeed(this.column.get('canEditRow'),
                          this.column, this.model) : true;
      if (canEditRow) {
        // Notify that we are about to enter in edit mode for current cell.
        this.model.trigger("enteringEditMode", [this]);

        Backgrid.Cell.prototype.enterEditMode.apply(this, arguments);
        /* Make sure - we listen to the click event */
        this.delegateEvents();
        var editable = Backgrid.callByNeed(this.column.editable(), this.column, this.model);

        if (editable) {
          this.$el.html(
            "<i class='fa fa-pencil-square subnode-edit-in-process'></i>"
            );
          this.model.trigger(
            "pg-sub-node:opened", this.model, this
            );
        }
      } else {
          Alertify.alert("This object is not editable by user",
            function(){
              return true;
          });
      }
    },
    render: function(){
        this.$el.empty();
        this.$el.html("<i class='fa fa-pencil-square-o'></i>");
        this.delegateEvents();
        if (this.grabFocus)
          this.$el.focus();
        return this;
    },
    exitEditMode: function() {
      var index = $(this.currentEditor.objectView.el)
        .find('.nav-tabs > .active > a[data-toggle="tab"]').first()
        .data('tabIndex');
      Backgrid.Cell.prototype.exitEditMode.apply(this, arguments);
      this.model.trigger(
          "pg-sub-node:closed", this, index
          );
      this.grabFocus = true;
    },
    events: {
      'click': function(e) {
        if (this.$el.find('i').first().hasClass('subnode-edit-in-process')) {
          // Need to redundantly undelegate events for Firefox
          this.undelegateEvents();
          this.currentEditor.save();
        } else {
          this.enterEditMode.call(this, []);
        }
        e.preventDefault();
      }
    }
  });

  var DeleteCell = Backgrid.Extension.DeleteCell = Backgrid.Cell.extend({
      defaults: _.defaults({
        defaultDeleteMsg: 'Are you sure you wish to delete this row?'
      }, Backgrid.Cell.prototype.defaults),

      /** @property */
      className: "delete-cell",
      events: {
        "click": "deleteRow"
      },
      deleteRow: function (e) {
        e.preventDefault();
        that = this;
        // We will check if row is deletable or not
        var canDeleteRow = (!_.isUndefined(this.column.get('canDeleteRow')) &&
                            _.isFunction(this.column.get('canDeleteRow')) ) ?
                             Backgrid.callByNeed(this.column.get('canDeleteRow'),
                              this.column, this.model) : true;
        if (canDeleteRow) {
          var delete_msg = !_.isUndefined(this.column.get('customDeleteMsg')) ?
                           this.column.get('customDeleteMsg'): that.defaults.defaultDeleteMsg;
          Alertify.confirm(
            'Delete Row',
            delete_msg,
            function(evt) {
              that.model.collection.remove(that.model);
            },
            function(evt) {
              return true;
            }
          );
        } else {
          Alertify.alert("This object can not be deleted",
            function(){
              return true;
            }
          );
        }
      },
      initialize: function () {
          Backgrid.Cell.prototype.initialize.apply(this, arguments);
      },
      render: function () {
          this.$el.empty();
          this.$el.html("<i class='fa fa-trash'></i>");
          this.delegateEvents();
          return this;
      }
  });

  var CustomHeaderCell = Backgrid.Extension.CustomHeaderCell = Backgrid.HeaderCell.extend({
    initialize: function () {
      // Here, we will add custom classes to header cell
      Backgrid.HeaderCell.prototype.initialize.apply(this, arguments);
      var getClassName = this.column.get('cellHeaderClasses');
      if (getClassName) {
        this.$el.addClass(getClassName);
      }
    }
  });

  /**
    SwitchCell renders a Bootstrap Switch in backgrid cell
  */
  var SwitchCell = Backgrid.Extension.SwitchCell = Backgrid.BooleanCell.extend({
    defaults: {
      options: _.defaults({
        onText: 'True',
        offText: 'False',
        onColor: 'success',
        offColor: 'default',
        size: 'mini'
        }, $.fn.bootstrapSwitch.defaults)
    },

    className: 'switch-cell',

    initialize: function() {
      Backgrid.BooleanCell.prototype.initialize.apply(this, arguments);
      this.onChange = this.onChange.bind(this);
    },

    enterEditMode: function() {
      this.$el.addClass('editor');
    },

    exitEditMode: function() {
      this.$el.removeClass('editor');
    },

    events: {
      'switchChange.bootstrapSwitch': 'onChange'
    },

    onChange: function () {
      var model = this.model,
          column = this.column,
          val = this.formatter.toRaw(this.$input.prop('checked'), model);

      // on bootstrap change we also need to change model's value
      model.set(column.get("name"), val);
    },

    render: function () {
      var col = _.defaults(this.column.toJSON(), this.defaults),
          attributes = this.model.toJSON(),
          attrArr = col.name.split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          model = this.model, column = this.column,
          rawValue = this.formatter.fromRaw(
            model.get(column.get("name")), model
          ),
          editable = Backgrid.callByNeed(col.editable, column, model);

      this.undelegateEvents();

      this.$el.empty();

      this.$el.append(
        $("<input>", {
          tabIndex: -1,
          type: "checkbox"
          }).prop('checked', rawValue).prop('disabled', !editable));
      this.$input = this.$el.find('input[type=checkbox]').first();

      // Override BooleanCell checkbox with Bootstrapswitch
      this.$input.bootstrapSwitch(
        _.defaults(
          {'state': rawValue, 'disabled': !editable}, col.options,
          this.defaults.options
          ));

      this.delegateEvents();

      return this;
    }
  });

  /*
   *  Select2Cell for backgrid.
   */
  var Select2Cell = Backgrid.Extension.Select2Cell =
      Backgrid.SelectCell.extend({
    className: "select2-cell",

    /** @property */
    editor: null,

    defaults: _.defaults({
      select2: {},
      opt: {
        label: null,
        value: null,
        selected: false
       }
      }, Backgrid.SelectCell.prototype.defaults),

    enterEditMode: function() {
      if (!this.$el.hasClass('editor'))
        this.$el.addClass('editor');
      this.$select.select2('focus');
      this.$select.select2('open');
      this.$select.on('blur', this.exitEditMode);
    },

    exitEditMode: function() {
      this.$select.off('blur', this.exitEditMode);
      this.$select.select2('close');
      this.$el.removeClass('editor');
    },

    events: {
      "select2:open": "enterEditMode",
      "select2:close": "exitEditMode",
      "change": "onSave",
      "select2:unselect": "onSave"
    },
    /** @property {function(Object, ?Object=): string} template */
    template: _.template([
      '<option value="<%- value %>" ',
      '<%= selected ? \'selected="selected"\' : "" %>>',
      '<%- label %></option>'].join(''),
      null,{
        variable: null
      }),

    initialize: function() {
      Backgrid.SelectCell.prototype.initialize.apply(this, arguments);
      this.onSave = this.onSave.bind(this);
      this.enterEditMode = this.enterEditMode.bind(this);
      this.exitEditMode = this.exitEditMode.bind(this);
    },

    render: function () {
      var col = _.defaults(this.column.toJSON(), this.defaults),
          model = this.model, column = this.column,
          editable = Backgrid.callByNeed(col.editable, column, model),
          optionValues = _.clone(this.optionValues ||
                (_.isFunction(this.column.get('options')) ?
                    (this.column.get('options'))(this) :
                    this.column.get('options')));

      this.undelegateEvents();

      if (this.$select) {
        if ( this.$select.data('select2')) {
          this.$select.select2('destroy');
        }
        delete this.$select;
        this.$select = null;
      }

      this.$el.empty();

      if (!_.isArray(optionValues))
        throw new TypeError("optionValues must be an array");

      /*
       * Add empty option as Select2 requires any empty '<option><option>' for
       * some of its functionality to work.
       */
      optionValues.unshift(this.defaults.opt);

      var optionText = null,
          optionValue = null,
          self = this,
          model = this.model,
          selectedValues = model.get(this.column.get("name")),
          select2_opts = _.extend(
            {openOnEnter: false, multiple:false}, self.defaults.select2,
            (col.select2 || {})
            ),
          selectTpl = _.template('<select <%=multiple ? "multiple" : "" %>></select>');

      $select = self.$select = $(selectTpl({
        multiple: select2_opts.multiple
      })).appendTo(self.$el);

      for (var i = 0; i < optionValues.length; i++) {
        var opt = optionValues[i];

        if (_.isArray(opt)) {

          optionText  = opt[0];
          optionValue = opt[1];

          $select.append(
            self.template({
               label: optionText,
               value: optionValue,
               selected: (selectedValues == optionValue) ||
                 (_.indexOf(selectedValues, optionValue) > -1)
            }));
         } else {
          opt = _.defaults({}, opt, {
            selected: ((selectedValues == opt.value) ||
                (_.indexOf(selectedValues, opt.value) > -1)),
            }, self.defaults.opt);
          $select.append(self.template(opt));
        }
      }

      if(col && _.has(col.disabled)) {
        _.extend(select2_opts, {
          disabled: evalF(col.disabled, col, model)
        });
      } else {
        _.extend(select2_opts, {disabled: !editable});
      }

      this.delegateEvents();

      // Initialize select2 control.
      this.$sel = this.$select.select2(select2_opts);

      // Select the highlighted item on Tab press.
      if (this.$sel) {
        this.$sel.data('select2').on("keypress", function(ev) {
          var self = this;

          // keycode 9 is for TAB key
          if (ev.which === 9 && self.isOpen()) {
            self.trigger('results:select', {});
            ev.preventDefault();
          }
        });
      }

      return this;
    },

    /**
       Saves the value of the selected option to the model attribute.
    */
    onSave: function (e) {
      var model = this.model;
      var column = this.column;

      model.set(column.get("name"), this.$select.val());
    },

    remove: function() {
      this.$select.off('change', this.onSave);
      if (this.$select.data('select2')) {
        this.$select.select2('destroy');
      }
      this.$el.empty();
      Backgrid.SelectCell.prototype.remove.apply(this, arguments);
    }
  });

  /**
    TextareaCellEditor the cell editor renders a textarea multi-line text input
    box as its editor.

    @class Backgrid.TextareaCellEditor
    @extends Backgrid.InputCellEditor
  */
  var TextareaCellEditor = Backgrid.TextareaCellEditor = Backgrid.InputCellEditor.extend({
    /** @property */
    tagName: "textarea",

    events: {
      "blur": "saveOrCancel",
      "keydown": ""
    }
  });

  /**
    TextareaCell displays multiline HTML strings.

      @class Backgrid.Extension.TextareaCell
      @extends Backgrid.Cell
  */
  var TextareaCell = Backgrid.Extension.TextareaCell = Backgrid.Cell.extend({
    /** @property */
    className: "textarea-cell",

    editor: TextareaCellEditor
  });


  /**
   * Custom header icon cell to add the icon in table header.
  */
  var CustomHeaderIconCell = Backgrid.Extension.CustomHeaderIconCell = Backgrid.HeaderCell.extend({
      /** @property */
      className: "header-icon-cell",
      events: {
        "click": "addHeaderIcon"
      },
      addHeaderIcon: function (e) {
        self = this;
        m = new (this.collection.model);
        this.collection.add(m)
        e.preventDefault();
      },
      render: function () {
          this.$el.empty();
          //this.$el.html("<i class='fa fa-plus-circle'></i>");
          this.$el.html("<label><a><span style='font-weight:normal;'>Array Values</a></span></label> <button class='btn-sm btn-default add'>Add</button>");
          this.delegateEvents();
          return this;
      }
  });


  var arrayCellModel = Backbone.Model.extend({
    defaults: {
        value: undefined
    }
  });

  /**
     Custom InputArrayCellEditor for editing user input array for debugger.
   */
  var InputArrayCellEditor = Backgrid.Extension.InputArrayCellEditor =
    Backgrid.CellEditor.extend({
      tagName: "div",

    events: {
      'blur': 'lostFocus'
    },

    render: function () {
        var self = this,
            arrayValuesCol = this.model.get(this.column.get("name")),
            tbl = $("<table></table>").appendTo(this.$el),
            gridCols = [
                    {name: 'value', label:'Array Values', type: 'text', cell:'string', headerCell: Backgrid.Extension.CustomHeaderIconCell, cellHeaderClasses: 'width_percent_100'},
                    ],
            gridBody = $("<div class='pgadmin-control-group backgrid form-group col-xs-12 object subnode'></div>");

        this.$el.attr('tabindex', '1');

        gridCols.unshift({
          name: "pg-backform-delete", label: "",
          cell: Backgrid.Extension.DeleteCell,
          //headerCell: Backgrid.Extension.CustomHeaderIconCell,
          editable: false, cell_priority: -1
        });

      this.$el.empty();
      var grid = self.grid = new Backgrid.Grid({
            columns: gridCols,
            collection:arrayValuesCol
          });

      grid.render();

      gridBody.append(grid.$el)

      this.$el.html(gridBody);

      $(self.$el).pgMakeVisible('backform-tab');
      self.delegateEvents();

      return this;
    },

    /*
     * Call back function when the grid lost the focus
     */
    lostFocus: function(ev) {

      var self = this,
      /*
       * Function to determine whether one dom element is descendant of another
       * dom element.
       */
      isDescendant = function (parent, child) {
         var node = child.parentNode;
         while (node != null) {
             if (node == parent) {
                 return true;
             }
             node = node.parentNode;
         }
         return false;
      }
      /*
       * Between leaving the old element focus and entering the new element focus the
       * active element is the document/body itself so add timeout to get the proper
       * focused active element.
       */
      setTimeout(function() {
        if (self.$el[0] != document.activeElement && !isDescendant(self.$el[0], document.activeElement)){
          var m = self.model,
            column = self.column;
          m.trigger('backgrid:edited', m, column, new Backgrid.Command(ev));

          setTimeout(function(){
            if (self.grid) {
                self.grid.remove();
                self.grid = null;
            }
          }, 10);


        }},10);
      return;
    }
  });

  /*
   * This will help us transform the user input string array values in proper format to be
   * displayed in the cell.
   */
  var InputStringArrayCellFormatter = Backgrid.Extension.InputStringArrayCellFormatter =
    function () {};
  _.extend(InputStringArrayCellFormatter.prototype, {
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function (rawData, model) {
        var values = []
        rawData.each(function(m){
            var val = m.get('value');
            if (_.isUndefined(val)) {
                values.push("null");
            } else {
                values.push(m.get("value"));
            }
          }
        );
        return values.toString();
    },
    toRaw: function (formattedData, model) {
      return formattedData;
    }
  });

  /*
   * This will help us transform the user input integer array values in proper format to be
   * displayed in the cell.
   */
  var InputIntegerArrayCellFormatter = Backgrid.Extension.InputIntegerArrayCellFormatter =
    function () {};
  _.extend(InputIntegerArrayCellFormatter.prototype, {
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function (rawData, model) {
        var values = []
        rawData.each(function(m){
            var val = m.get('value');
            if (_.isUndefined(val)) {
                values.push("null");
            } else {
                values.push(m.get("value"));
            }
          }
        );
        return values.toString();
    },
    toRaw: function (formattedData, model) {
        formattedData.each(function(m){
            m.set("value", parseInt(m.get('value')), {silent: true});
        });

      return formattedData;
    }
  });

  /*
   *  InputStringArrayCell for rendering and taking input for string array type in debugger
   */
  var InputStringArrayCell = Backgrid.Extension.InputStringArrayCell = Backgrid.Cell.extend({
    className: "width_percent_25",
    formatter: InputStringArrayCellFormatter,
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);
        // set value to empty array.
        var m = arguments[0].model;
        if (_.isUndefined(this.collection)) {
            this.collection = new (Backbone.Collection.extend({
            model: arrayCellModel}))(m.get('value'));
        }

        this.model.set(this.column.get('name'), this.collection);

        this.listenTo(this.collection, "remove", this.render);
    },
  });

  /*
   *  InputIntegerArrayCell for rendering and taking input for integer array type in debugger
   */
  var InputIntegerArrayCell = Backgrid.Extension.InputIntegerArrayCell = Backgrid.Cell.extend({
    className: "width_percent_25",
    formatter: InputIntegerArrayCellFormatter,
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);
        // set value to empty array.
        var m = arguments[0].model;
        if (_.isUndefined(this.collection)) {
            this.collection = new (Backbone.Collection.extend({
            model: arrayCellModel}))(m.get('value'));
        }


        this.model.set(this.column.get('name'),this.collection);

        this.listenTo(this.collection, "remove", this.render);
    },
  });

  /**
   * DependentCell functions can be used with the different cell type in order
   * to setup the callback for the depedent attribute change in the model.
   *
   * Please implement the 'dependentChanged' as the callback in the used cell.
   *
   * @class Backgrid.Extension.DependentCell
   **/
  var DependentCell = Backgrid.Extension.DependentCell = function() {};

  _.extend(
    DependentCell.prototype, {
      initialize: function(){
        // Listen to the dependent fields in the model for any change
        var deps = this.column.get('deps');
        var self = this;

        if (deps && _.isArray(deps)) {
          _.each(deps, function(d) {
            attrArr = d.split('.');
            name = attrArr.shift();
            self.listenTo(self.model, "change:" + name, self.dependentChanged);
          });
        }
      },
      remove: function() {
        // Remove the events for the dependent fields in the model
        var self = this,
          deps = self.column.get('deps');

        if (deps && _.isArray(deps)) {
          _.each(deps, function(d) {
            attrArr = d.split('.');
            name = attrArr.shift();

            self.stopListening(self.model, "change:" + name, self.dependentChanged);
          });
        }
      }
    });

  /**
   Formatter for PasswordCell.

   @class Backgrid.PasswordFormatter
   @extends Backgrid.CellFormatter
   @constructor
  */
  var PasswordFormatter = Backgrid.PasswordFormatter = function () {};
  PasswordFormatter.prototype = new Backgrid.CellFormatter();
  _.extend(PasswordFormatter.prototype, {
    fromRaw: function (rawValue, model) {

      if (_.isUndefined(rawValue) || _.isNull(rawValue)) return '';

      var pass = '';
      for(var i = 0; i < rawValue.length; i++) {
        pass += '*';
      }
      return pass;
    }
  });

  var PasswordCell = Backgrid.Extension.PasswordCell  = Backgrid.StringCell.extend({

    formatter: PasswordFormatter,

    editor: Backgrid.InputCellEditor.extend({
      attributes: {
        type: "password"
      },

      render: function () {
        var model = this.model;
        this.$el.val(model.get(this.column.get("name")));
        return this;
      }
    })
  });

  /*
   * Override NumberFormatter to support NaN, Infinity values.
   * On client side, JSON do not directly support NaN & Infinity,
   * we explicitly converted it into string format at server side
   * and we need to parse it again in float at client side.
   */
  _.extend(Backgrid.NumberFormatter.prototype, {
    fromRaw: function (number, model) {
      if (_.isNull(number) || _.isUndefined(number)) return '';

      number = parseFloat(number).toFixed(~~this.decimals);

      var parts = number.split('.');
      var integerPart = parts[0];
      var decimalPart = parts[1] ? (this.decimalSeparator || '.') + parts[1] : '';

      return integerPart.replace(this.HUMANIZED_NUM_RE, '$1' + this.orderSeparator) + decimalPart;
    }
  });

  /*
   *  JSONBCell Formatter.
   */
  var JSONBCellFormatter = Backgrid.Extension.JSONBCellFormatter =
    function () {};
  _.extend(JSONBCellFormatter.prototype, {
    fromRaw: function (rawData, model) {
        // json data
        if(_.isArray(rawData)) {
          var converted_data = '';
          converted_data = _.map(rawData, function(data) {
            return JSON.stringify(JSON.stringify(data));
          });
          return '{' + converted_data.join() + '}';
        } else if(_.isObject(rawData)) {
          return JSON.stringify(rawData);
        } else {
          return rawData;
        }
    },
    toRaw: function (formattedData, model) {
      return formattedData;
    }
  });

  /*
   *  JSONBCell for backgrid.
   */
  var JSONBCell = Backgrid.Extension.JSONBCell =
      Backgrid.StringCell.extend({
        className: "jsonb-cell",
        formatter: JSONBCellFormatter
      });

  var DatepickerCell = Backgrid.Extension.DatepickerCell = Backgrid.Cell.extend({
    editor: DatepickerCellEditor
  });

  var DatepickerCellEditor = Backgrid.InputCellEditor.extend({
    events:{},
    initialize:function() {
      Backgrid.InputCellEditor.prototype.initialize.apply(this, arguments);
      var input = this;
      $(this.el).prop('readonly', true);
      $(this.el).datepicker({
        onClose: function(newValue){
          var command = new Backgrid.Command({});
          input.model.set(input.column.get("name"), newValue);
          input.model.trigger(
            "backgrid:edited", input.model, input.column, command
          );
          command = input = null;
        }
      });
    }
  });

  // Reference:
  // https://github.com/wyuenho/backgrid-moment-cell/blob/master/backgrid-moment-cell.js
  /**
   MomentFormatter converts bi-directionally any datetime values in any format
   supported by [moment()](http://momentjs.com/docs/#/parsing/) to any
   datetime format
   [moment.fn.format()](http://momentjs.com/docs/#/displaying/format/)
   supports.
   @class Backgrid.Extension.MomentFormatter
   @extends Backgrid.CellFormatter
   @constructor
   */
  var MomentFormatter = Backgrid.Extension.MomentFormatter = function (options) {
    _.extend(this, this.defaults, options);
  };

  MomentFormatter.prototype = new Backgrid.CellFormatter;
  _.extend(MomentFormatter.prototype, {
    /**
       @cfg {Object} options
       @cfg {boolean} [options.modelInUnixOffset=false] Whether the model values
       should be read/written as the number of milliseconds since UNIX Epoch.
       @cfg {boolean} [options.modelInUnixTimestamp=false] Whether the model
       values should be read/written as the number of seconds since UNIX Epoch.
       @cfg {boolean} [options.modelInUTC=true] Whether the model values should
       be read/written in UTC mode or local mode.
       @cfg {string} [options.modelLang=moment.locale() moment>=2.8.0 |
       moment.lang() moment<2.8.0] The locale the model values should be
       read/written in.
       @cfg {string} [options.modelFormat=moment.defaultFormat] The format this
       moment formatter should use to read/write model values. Only meaningful if
       the values are strings.
       @cfg {boolean} [options.displayInUnixOffset=false] Whether the display
       values should be read/written as the number of milliseconds since UNIX
       Epoch.
       @cfg {boolean} [options.displayInUnixTimestamp=false] Whether the display
       values should be read/written as the number of seconds since UNIX Epoch.
       @cfg {boolean} [options.displayInUTC=true] Whether the display values
       should be read/written in UTC mode or local mode.
       @cfg {string} [options.displayLang=moment.locale() moment>=2.8.0 |
       moment.lang() moment<2.8.0] The locale the display values should be
       read/written in.
       @cfg {string} [options.displayFormat=moment.defaultFormat] The format
       this moment formatter should use to read/write dislay values.
       */
    defaults: {
      modelInUnixOffset: false,
      modelInUnixTimestamp: false,
      modelInUTC: true,
      modelLang: moment.locale(),
      modelFormat: moment.defaultFormat,
      displayInUnixOffset: false,
      displayInUnixTimestamp: false,
      displayInUTC: true,
      displayLang: moment.locale(),
      displayFormat: moment.defaultFormat,
      allowEmpty: false
    },

    /**
       Converts datetime values from the model for display.
       @member Backgrid.Extension.MomentFormatter
       @param {*} rawData
       @return {string}
       */
    fromRaw: function (rawData) {
      if (rawData == null) return '';

      var m = this.modelInUnixOffset ? moment(rawData) :
        this.modelInUnixTimestamp ? moment.unix(rawData) :
        this.modelInUTC ?
        moment.utc(rawData, this.modelFormat, this.modelLang) :
        moment(rawData, this.modelFormat, this.modelLang);

      if (this.displayInUnixOffset) return +m;

      if (this.displayInUnixTimestamp) return m.unix();

      if (this.displayLang) m.locale(this.displayLang);

      if (this.displayInUTC) m.utc(); else m.local();

      if (this.displayFormat != moment.defaultFormat) {
        return m.format(this.displayFormat);
      }

      return m.format();
    },

    /**
       Converts datetime values from user input to model values.
       @member Backgrid.Extension.MomentFormatter
       @param {string} formattedData
       @return {string}
       */
    toRaw: function (formattedData) {

      var m = this.displayInUnixOffset ? moment(+formattedData) :
        this.displayInUnixTimestamp ? moment.unix(+formattedData) :
        this.displayInUTC ?
        moment.utc(formattedData, this.displayFormat, this.displayLang) :
        moment(formattedData, this.displayFormat, this.displayLang);

      if (!m || !m.isValid()) return (this.allowEmpty && formattedData === '') ? null : undefined;

      if (this.modelInUnixOffset) return +m;

      if (this.modelInUnixTimestamp) return m.unix();

      if (this.modelLang) m.locale(this.modelLang);

      if (this.modelInUTC) m.utc(); else m.local()

      if (this.modelFormat != moment.defaultFormat) {
        return m.format(this.modelFormat);
      }

      return m.format();
    }
  });

  var MomentCell = Backgrid.Extension.MomentCell = Backgrid.Cell.extend({

    editor: Backgrid.InputCellEditor,

    /** @property */
    className: "datetime-cell",

    /** @property {Backgrid.CellFormatter} [formatter=Backgrid.Extension.MomentFormatter] */
    formatter: MomentFormatter,

    /**
       Initializer. Accept Backgrid.Extension.MomentFormatter.options and
       Backgrid.Cell.initialize required parameters.
     */
    initialize: function (options) {

      MomentCell.__super__.initialize.apply(this, arguments);

      var formatterDefaults = MomentFormatter.prototype.defaults;
      var formatterDefaultKeys = _.keys(formatterDefaults);
      var classAttrs = _.pick(this, formatterDefaultKeys);
      var formatterOptions = _.pick(options, formatterDefaultKeys);
      var columnsAttrs = _.pick(this.column.toJSON(), formatterDefaultKeys);

      // Priority of the options for the formatter, from highest to lowerest
      // 1. MomentCell instance options
      // 2. MomentCell class attributes
      // 3. MomentFormatter defaults

      // this.formatter will have been instantiated now
      _.extend(this.formatter, formatterDefaults, classAttrs, formatterOptions, columnsAttrs);

      this.editor = this.editor.extend({
        attributes: _.extend({}, this.editor.prototype.attributes || this.editor.attributes || {}, {
          placeholder: this.formatter.displayFormat
        }),
        options: this.column.get('options')
      });
    }
  });

  var DatetimePickerEditor = Backgrid.Extension.DatetimePickerEditor = Backgrid.InputCellEditor.extend({
    postRender: function() {
      var self = this,
          evalF = function() {
            var args = [];
            Array.prototype.push.apply(args, arguments);
            var f = args.shift();

            if (typeof(f) === 'function') {
              return f.apply(self, args);
            }
            return f;
          },
          options = _.extend({
            format: "YYYY-MM-DD HH:mm:ss Z",
            showClear: true,
            showTodayButton: true,
            toolbarPlacement: 'top'
          }, evalF(this.column.get('options')), {
            keyBinds: {
              "shift tab": function(widget) {
                if (widget) {
                  // blur the input
                  setTimeout(
                    function() {
                      self.closeIt({keyCode: 9, shiftKey: true});
                    }, 10
                  );
                }
              },
              tab: function(widget) {
                if (widget) {
                  // blur the input
                  setTimeout(
                    function() {
                      self.closeIt({keyCode: 9});
                    }, 10
                  );
                }
              }
            }
          });
      this.$el.datetimepicker(options);
      this.$el.datetimepicker('show');
      this.picker = this.$el.data('DateTimePicker');
    },
    events: {
      'dp.hide': 'closeIt'
    },
    closeIt: function(ev) {
      var formatter = this.formatter,
          model = this.model;
          column = this.column;
          val = this.$el.val();
          newValue = formatter.toRaw(val, model);

      if (this.is_closing)
        return;
      this.is_closing = true;
      this.$el.datetimepicker('destroy');
      this.is_closing = false;

      var command = new Backgrid.Command(ev);

      if (_.isUndefined(newValue)) {
        model.trigger("backgrid:error", model, column, val);
      } else {
        model.set(column.get("name"), newValue);
        model.trigger("backgrid:edited", model, column, command);
      }
    }
  });

  _.extend(MomentCell.prototype, MomentFormatter.prototype.defaults);

  return Backgrid;

}));
