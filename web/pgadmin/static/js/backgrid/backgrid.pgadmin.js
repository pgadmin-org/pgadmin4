(function(root, factory) {
  // Set up Backform appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify'],
     function(_, $, Backbone, Backform, Backgrid, Alertify) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backform.
      return factory(root, _, $, Backbone, Backform, Alertify);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore') || root._,
      $ = root.jQuery || root.$ || root.Zepto || root.ender,
      Backbone = require('backbone') || root.Backbone,
      Backform = require('backform') || root.Backform;
      Alertify = require('alertify') || root.Alertify;
    factory(root, _, $, Backbone, Backform, Alertify);

  // Finally, as a browser global.
  } else {
    factory(root, root._, (root.jQuery || root.Zepto || root.ender || root.$), root.Backbone, root.Backform);
  }
} (this, function(root, _, $, Backbone, Backform, Alertify) {
  var ObjectCellEditor = Backgrid.Extension.ObjectCellEditor = Backgrid.CellEditor.extend({
    modalTemplate: _.template([
      '<div class="subnode-dialog">',
      '    <div class="subnode-body"></div>',
      '    <div class="subnode-footer">',
      '        <button style ="float:right;margin-right:15px;margin-top: 4px;" class="cancel btn btn-danger" type="cancel">Cancel</button>',
      '        <button style ="float:right;margin-right:10px;margin-top: 4px;" class="save btn btn-primary" type="save">Save</button>',
      '    </div>',
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
      if (!this.origModel) {
        this.origModel = this.model;
        this.model = this.origModel.clone();
      }

      var $dialog = this.createDialog(columns_length);

      // Add the Bootstrap form
      var $form = $('<form class="form-dialog"></form>');
      $dialog.find('div.subnode-body').append($form);

      // Call Backform to prepare dialog
      back_el = $dialog.find('form.form-dialog');
      Backform.tabClassName = "sub-node-form col-sm-12";

      objectView = new Backform.Dialog({
        el: back_el, model: this.model, schema: this.schema,
      });

      objectView.render();

      return this;
    },
    createDialog: function(noofcol) {
      var editor1 = this,
          $dialog = this.$dialog = $(this.modalTemplate({title: ""})),
          tr = $("<tr>"),
          td = $("<td>", {class: 'editable sortable renderable', style: 'height: auto', colspan: noofcol+2}).appendTo(tr);

      noofcol = noofcol || 1;
      // Handle close and save events
      $dialog.find('button.cancel').click(function(e) {
        e.preventDefault();
        editor1.cancel();
        tr.remove();
        return false;
      });
      $dialog.find('button.save').click(function(e) {
        e.preventDefault();
        editor1.save();
        tr.remove();
        return false;
      });

      // Show the Bootstrap modal dialog
      td.append($dialog.css('display', 'block'));
      this.el.parent('tr').after(tr);

      return $dialog;
    },
    save: function(options) {
      options || (options = {});
      var model = this.origModel,
          column = this.column,
          objectModel = this.model,
          $form = this.$dialog.find('form');

      // Retrieve values from the form, and store inside the object model
      var changes = {};
      _.each(this.schema, function(field) {
        inputType = (field.control == 'datepicker' ? 'input' : field.control);
        val = $form.find(inputType + '[name='+field.name+']').first().val()
        val = (field.cell == 'integer') ? parseInt(val) :
              (field.cell == 'number') ? parseFloat(val) : val

        changes[field.name] = val;
      });

      objectModel.set(changes);
      model.set(changes, options);

      model.trigger("backgrid:edited", model, column, new Backgrid.Command({keyCode:13}));

      return this;
    },
    cancel: function() {
      this.origModel.trigger("backgrid:edited", this.origModel, this.column, new Backgrid.Command({keyCode:27}));
      return this;
    },
    remove: function() {
      this.$dialog.modal("hide").remove();
      Backgrid.CellEditor.prototype.remove.apply(this, arguments);
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
      editorOptions['columns_length'] = this.column.collection.length

      this.listenTo(this.model, "backgrid:edit", function (model, column, cell, editor) {
        if (column.get("name") == this.column.get("name"))
          editor.extendWithOptions(editorOptions);
      });
    },
    enterEditMode: function () {
      var $content = this.$el.html();
      Backgrid.Cell.prototype.enterEditMode.apply(this, arguments);
      var editable = Backgrid.callByNeed(this.column.editable(), this.column, this.model);
      if (editable) this.$el.html("<i class='fa fa-minus-square-o'></i>");
    },
    render: function(){
        this.$el.empty();
        this.$el.html("<i class='fa fa-pencil-square-o'></i>");
        this.delegateEvents();
        return this;
    }
  });

  var DeleteCell = Backgrid.Extension.DeleteCell = Backgrid.Cell.extend({
      /** @property */
      className: "delete-cell",
      events: {
        "click": "deleteRow"
      },
      deleteRow: function (e) {
        e.preventDefault();
        that = this;
        Alertify.confirm(
            'Delete Row',
            'Are You Sure, you want to delete this object?',
            function(evt) {
              that.model.collection.remove(that.model);
            },
            function(evt) {
              return true;
            }
          );
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

  return Backgrid;

}));
