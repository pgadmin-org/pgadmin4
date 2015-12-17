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
      this.$dialog.modal("hide").remove();
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


/**
   Custom cell formatter for privileges.
 */
var PrivilegeCellFormatter = Backgrid.Extension.PrivilegeCellFormatter = function () {};
_.extend(PrivilegeCellFormatter.prototype, {

  fromRaw: function (rawData, model) {
    return rawData;
  },


  /* Convert string privileges to object privileges for manipulation.

   E.g C*Tc ===> {"C":{"privilege":true,
                        "withGrantPrivilege":true},
                  "T":{"privilege":true,
                        "withGrantPrivilege":false},
                  "c":{"privilege":true,
                        "withGrantPrivilege":false}
                 }
  */

  fromRawToObject: function (rawData, model) {
    var objData = {};
    var currentChar = "";
    for (var i = 0, len = rawData.length; i < len; i++) {
        if (rawData[i] == "*" && currentChar != ""){
            if ( _.has(objData,currentChar)){
                objData[currentChar]["withGrantPrivilege"] = true;
            }
        }else{
            currentChar = rawData[i]
            objData[currentChar] = {"privilege":true,
                                    "withGrantPrivilege":false};
        }
    }
    return objData;
  },

  toRaw: function (formattedData, model) {
    return formattedData;
  }

});

/**
   Custom cell editor for editing privileges.
 */

var PrivilegeCellEditor = Backgrid.Extension.PrivilegeCellEditor = Backgrid.CellEditor.extend({
    tagName: "div",
    template: _.template(['<tr>',
        '<td class="renderable"><label><input type="checkbox" name="<%- value %>" <%= privilege ? \'checked\' : "" %>><%- name %></label></td>',
        '<td class="renderable"><label><input type="checkbox" name="<%- value %>_grant" <%= withGrantPrivilege ? \'checked\' : "" %>>WITH GRANT OPTION</label></td>',
        '</tr>'].join(" "), null, {variable: null}),

    initialize: function() {
        Backgrid.CellEditor.prototype.initialize.apply(this, arguments);
        this.elId =  _.uniqueId('pgPriv_');
    },
  setPrivilegeOptions: function (privilegeOptions){
    this.privilegeOptions = privilegeOptions;
  },

   render: function () {
    this.$el.empty();
    this.$el.attr('tabindex', '1');
    this.$el.attr('id', this.elId);
    this.$el.attr('privilegeseditor', '1');

    var privilegeOptions = _.result(this, "privilegeOptions");
    var model = this.model;
    var selectedValues = this.formatter.fromRawToObject(model.get(this.column.get("name")), model),
        tbl = $("<table></table>").appendTo(this.$el);

    if (!_.isArray(privilegeOptions)) throw new TypeError("privilegeOptions must be an array");
    self = this;
    // For each privilege generate html template.
    _.each(privilegeOptions, function (privilegeOption){
        var templateData = {name: privilegeOption['name'],
                            value: privilegeOption['value'],
                            privilege : false,
                            withGrantPrivilege : false
                            };

        if ( _.has(selectedValues,privilegeOption['value'])){
            _.extend(templateData,{ privilege:selectedValues[privilegeOption['value']]["privilege"],
                                    withGrantPrivilege:selectedValues[privilegeOption['value']]["withGrantPrivilege"]
                                    });
        }

        var editorHtml = self.template(templateData);
        tbl.append(editorHtml);

        var $prvilegeGrantCheckbox = self.$el.find("[name='" + privilegeOption['value'] + "_grant']");

        // Add event listeners on each privilege checkbox. And set initial state.
        // Update model if user changes value.
        $prvilegeGrantCheckbox.click(function(e) {
            var addRemoveflag = $(this).is(':checked');
            privilege = this.name;
            self.updateModel(privilege, addRemoveflag);
        });

        var $prvilegeCheckbox = self.$el.find("[name='" + privilegeOption['value'] + "']");

        if (!$prvilegeCheckbox.is(':checked')) {
               $prvilegeGrantCheckbox.attr("disabled", true);
               $prvilegeGrantCheckbox.attr("checked", false);
        }

        $prvilegeCheckbox.click(function(e) {
            var addRemoveflag = $(this).is(':checked');
            privilege = this.name;
            if (addRemoveflag) {
                $prvilegeGrantCheckbox.removeAttr("disabled");
            } else {
               $prvilegeGrantCheckbox.attr("disabled", true);
               $prvilegeGrantCheckbox.attr("checked", false);
            }
            self.updateModel(privilege, addRemoveflag);
        });
      });

      self.$el.find('input[type=checkbox]').blur(self.focusLost.bind(this)).first().focus();
      self.delegateEvents();
      return this;
    },
    updateModel: function(privilege, addRemoveflag){
    // Update model with new privilege string. e.g. 'C*Tc'.
        var self = this,
            model = self.model,
            column = self.column,
            newVal = "",
            withGrant = false,
            privilegeConst = privilege[0];

        if (privilege.length > 1){
            withGrant = true;
        }

        oldValObj = self.formatter.fromRawToObject(model.get(self.column.get("name")), model);

        if (addRemoveflag){
            if (!withGrant){
                oldValObj[privilegeConst] = {"privilege": true,
                                            "withGrantPrivilege":false};
            }else{
                oldValObj[privilegeConst] = {"privilege": true,
                                            "withGrantPrivilege":true}
            }
        }else{
            if (!withGrant){
                oldValObj[privilegeConst] = {"privilege": false,
                                            "withGrantPrivilege":false};
            }else{
                oldValObj[privilegeConst] = {"privilege": true,
                                            "withGrantPrivilege":false};
            }
        }

        for (var i = 0, len = model.privileges.length; i < len; i++) {
            if ( _.has(oldValObj, model.privileges[i])){
                if(oldValObj[model.privileges[i]]["privilege"]){
                    newVal = newVal + model.privileges[i]
                }
                if(oldValObj[model.privileges[i]]["withGrantPrivilege"]){
                    newVal = newVal + "*"
                }
            }
        }
        model.set(column.get("name"), newVal);
    },
    focusLost :function(e) {
      setTimeout(
        function() {
          var lostFocus = true;
          if (document.activeElement) {
            lostFocus = !(
                $(document.activeElement).closest(
                  'div[privilegeseditor=1]'
                  ).first().attr('id') == this.$el.attr('id')
                );
          }
          if (lostFocus) {
            this.model.trigger("backgrid:edited", this.model, this.column, new Backgrid.Command(e));
          }
        }.bind(this), 200);
    }
  });

  var PrivilegeCell = Backgrid.Extension.PrivilegeCell = Backgrid.Cell.extend({
    className: "edit-cell",
    // All available privileges.
    privilegeLabels: {  "C": "CREATE",
                        "T": "TEMP",
                        "c": "CONNECT",
                        "a": "INSERT",
                        "r": "SELECT",
                        "w": "UPDATE",
                        "d": "DELETE",
                        "D": "TRUNCATE",
                        "x": "REFERENCES",
                        "t": "TRIGGER",
                        "U": "USAGE",
                        "X": "EXECUTE"
                     },

    formatter: PrivilegeCellFormatter,

    editor: PrivilegeCellEditor,

    initialize: function(options) {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);

      var privilegeOptions = [];
      var privileges = this.model.privileges || [];
      self = this;
      // Generate array of privileges to be shown in editor.
      _.each(privileges, function(privilege){
            privilegeOptions.push({name:self.privilegeLabels[privilege],
                                    value:privilege})
      })

      this.listenTo(this.model, "backgrid:edit", function (model, column, cell, editor) {
        if (column.get("name") == this.column.get("name"))
        // Set available privilege options in editor.
          editor.setPrivilegeOptions(privilegeOptions);
      });
    },

    render: function(){
        this.$el.empty();
        var model = this.model;
        this.$el.text(this.formatter.fromRaw(model.get(this.column.get("name")), model));
        this.delegateEvents();
        if (this.grabFocus)
          this.$el.focus();
        return this;
    },

    exitEditMode: function() {
      Backgrid.Cell.prototype.exitEditMode.apply(this, arguments);
      this.render();
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

  return Backgrid;

}));
