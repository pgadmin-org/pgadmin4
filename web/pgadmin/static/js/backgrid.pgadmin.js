/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'underscore', 'jquery', 'backbone', 'backform', 'backgrid', 'alertify',
  'moment', 'bignumber', 'codemirror', 'sources/utils', 'sources/keyboard_shortcuts', 'sources/select2/configure_show_on_scroll',
  'sources/window', 'bootstrap.datetimepicker', 'backgrid.filter', 'bootstrap.toggle',
], function(
  gettext, _, $, Backbone, Backform, Backgrid, Alertify, moment, BigNumber, CodeMirror,
  commonUtils, keyboardShortcuts, configure_show_on_scroll, pgWindow
) {
  /*
   * Add mechanism in backgrid to render different types of cells in
   * same column;
   */
  let pgAdmin = (window.pgAdmin = window.pgAdmin || {}),
    pgBrowser = pgAdmin.Browser;

  // Add new property cellFunction in Backgrid.Column.
  _.extend(Backgrid.Column.prototype.defaults, {
    cellFunction: undefined,
  });

  // Add tooltip to cell if cell content is larger than
  // cell width
  _.extend(Backgrid.Cell.prototype.events, {
    'mouseover': function() {
      var $el = $(this.el);
      if ($el.text().length > 0 && !$el.attr('title') &&
        ($el.innerWidth() + 1) < $el[0].scrollWidth
      ) {
        $el.attr('title', $.trim($el.text()));
      }
    },
  });

  // bind shortcut in cell edit mode
  _.extend(Backgrid.InputCellEditor.prototype.events, {
    'keydown': function(e) {
      let preferences = pgWindow.default.pgAdmin.Browser.get_preferences_for_module('browser');
      if(preferences && keyboardShortcuts.validateShortcutKeys(preferences.add_grid_row,e)) {
        pgBrowser.keyboardNavigation.bindAddGridRow();
      } else {
        Backgrid.InputCellEditor.prototype.saveOrCancel.apply(this, arguments);
      }
    },
  });

  /* Overriding backgrid sort method.
   * As we are getting numeric, integer values as string
   * from server side, but on client side javascript truncates
   * large numbers automatically due to which backgrid was unable
   * to sort numeric values properly in the grid.
   * To fix this issue, now we check if cell type is integer/number
   * convert it into BigNumber object and make comparison to perform sorting.
   */

  _.extend(Backgrid.Body.prototype, {
    sort: function(column, direction) {

      if (!_.contains(['ascending', 'descending', null], direction)) {
        throw new RangeError('direction must be one of "ascending", "descending" or `null`');
      }

      if (_.isString(column)) column = this.columns.findWhere({
        name: column,
      });

      var collection = this.collection;

      var order;
      if (direction === 'ascending') order = -1;
      else if (direction === 'descending') order = 1;
      else order = null;

      // Get column type and pass it to comparator.
      var col_type = column.get('cell').prototype.className || 'string-cell',
        comparator = this.makeComparator(column.get('name'), order,
          order ?
            column.sortValue() :
            function(model) {
              return model.cid.replace('c', '') * 1;
            }, col_type);

      if (Backbone.PageableCollection &&
        collection instanceof Backbone.PageableCollection) {

        collection.setSorting(order && column.get('name'), order, {
          sortValue: column.sortValue(),
        });

        if (collection.fullCollection) {
          // If order is null, pageable will remove the comparator on both sides,
          // in this case the default insertion order comparator needs to be
          // attached to get back to the order before sorting.
          if (collection.fullCollection.comparator == null) {
            collection.fullCollection.comparator = comparator;
          }
          collection.fullCollection.sort();
          collection.trigger('backgrid:sorted', column, direction, collection);
        } else collection.fetch({
          reset: true,
          success: function() {
            collection.trigger('backgrid:sorted', column, direction, collection);
          },
        });
      } else {
        collection.comparator = comparator;
        collection.sort();
        collection.trigger('backgrid:sorted', column, direction, collection);
      }

      column.set('direction', direction);

      return this;
    },
    makeComparator: function(attr, order, func, type) {

      return function(left, right) {
        // extract the values from the models

        var l = func(left, attr),
          r = func(right, attr),
          t;
        if (_.isUndefined(l) || _.isUndefined(r)) return;

        var types = ['number-cell', 'integer-cell'];
        if (_.include(types, type)) {
          var _l, _r;
          // NaN if invalid number
          try {
            _l = new BigNumber(l);
          } catch (err) {
            _l = NaN;
          }

          try {
            _r = new BigNumber(r);
          } catch (err) {
            _r = NaN;
          }

          // if descending order, swap left and right
          if (order === 1) {
            t = _l;
            _l = _r;
            _r = t;
          }

          if (_l.eq(_r)) // If both are equals
            return 0;
          else if (_l.lt(_r)) // If left is less than right
            return -1;
          else
            return 1;
        } else {
          // if descending order, swap left and right
          if (order === 1) {
            t = l;
            l = r;
            r = t;
          }

          // compare as usual
          if (l === r) return 0;
          else if (l === null && r != null) return -1;
          else if (l != null && r === null) return 1;
          else if (l < r) return -1;
          return 1;
        }
      };
    },
    moveToNextCell: function (model, column, command) {
      var i = this.collection.indexOf(model);
      var j = this.columns.indexOf(column);
      var cell, renderable, editable, m, n;

      // return if model being edited in a different grid
      if (j === -1) return this;

      this.rows[i].cells[j].exitEditMode();

      if (command.moveUp() || command.moveDown() || command.moveLeft() ||
          command.moveRight() || command.save()) {
        var l = this.columns.length;
        var maxOffset = l * this.collection.length;

        if (command.moveUp() || command.moveDown()) {
          m = i + (command.moveUp() ? -1 : 1);
          var row = this.rows[m];
          if (row) {
            cell = row.cells[j];
            if (Backgrid.callByNeed(cell.column.editable(), cell.column, model)) {
              cell.enterEditMode();
              model.trigger('backgrid:next', m, j, false);
            }
          }
          else model.trigger('backgrid:next', m, j, true);
        }
        else if (command.moveLeft() || command.moveRight()) {
          var right = command.moveRight();
          for (var offset = i * l + j + (right ? 1 : -1);
            offset >= 0 && offset < maxOffset;
            right ? offset++ : offset--) {
            m = ~~(offset / l);
            n = offset - m * l;
            cell = this.rows[m].cells[n];
            renderable = Backgrid.callByNeed(cell.column.renderable(), cell.column, cell.model);
            editable = Backgrid.callByNeed(cell.column.editable(), cell.column, model);
            if(cell && cell.$el.hasClass('edit-cell') &&
              !cell.$el.hasClass('privileges') || cell.$el.hasClass('delete-cell')) {
              model.trigger('backgrid:next', m, n, false);
              if(cell.$el.hasClass('delete-cell')) {
                setTimeout(function(){
                  $(cell.$el).trigger('focus');
                }, 50);
              }
              break;
            } else if (renderable && editable) {
              cell.enterEditMode();
              model.trigger('backgrid:next', m, n, false);
              break;
            }
          }

          if (offset == maxOffset) {
            model.trigger('backgrid:next', ~~(offset / l), offset - m * l, true);
          }
        }
      }

      return this;
    },
  });

  _.extend(Backgrid.Row.prototype, {
    makeCell: function(column) {
      return new(this.getCell(column))({
        column: column,
        model: this.model,
      });
    },
    /*
     * getCell function will check and execute user given cellFunction to get
     * appropriate cell class for current cell being rendered.
     * User provided cellFunction must return valid cell class.
     * cellFunction will be called with context (this) as column and model as
     * argument.
     */
    getCell: function(column) {
      var cf = column.get('cellFunction');
      if (_.isFunction(cf)) {
        var cell = cf.apply(column, [this.model]);
        try {
          return Backgrid.resolveNameToClass(cell, 'Cell');
        } catch (e) {
          if (e instanceof ReferenceError) {
            // Fallback to column cell.
            return column.get('cell');
          } else {
            throw e; // Let other exceptions bubble up
          }
        }
      } else {
        return column.get('cell');
      }
    },
  });

  var ObjectCellEditor = Backgrid.Extension.ObjectCellEditor = Backgrid.CellEditor.extend({
    modalTemplate: _.template([
      '<div class="subnode-dialog" tabindex="0">',
      '    <div class="subnode-body"></div>',
      '</div>',
    ].join('\n')),
    stringTemplate: _.template([
      '<div class="form-group">',
      '  <label class="control-label col-sm-4"><%=label%></label>',
      '  <div class="col-sm-8">',
      '    <input type="text" class="form-control" name="<%=name%>" value="<%=value%>" placeholder="<%=placeholder%>" />',
      '  </div>',
      '</div>',
    ].join('\n')),
    extendWithOptions: function(options) {
      _.extend(this, options);
    },
    render: function() {
      return this;
    },
    postRender: function(model, column) {
      var columns_length = this.columns_length,
        // To render schema directly from Backgrid cell we use columns schema
        // attribute.
        schema = this.schema.length ? this.schema : this.column.get('schema');

      if (column != null && column.get('name') != this.column.get('name'))
        return false;

      if (!_.isArray(schema)) throw new TypeError('schema must be an array');

      // Create a Backbone model from our object if it does not exist
      var $dialog = this.createDialog(columns_length);

      // Add the Bootstrap form
      var $form = $('<form class="form-dialog"></form>');
      $dialog.find('div.subnode-body').append($form);

      // Call Backform to prepare dialog
      var back_el = $dialog.find('form.form-dialog');

      this.objectView = new Backform.Dialog({
        el: back_el,
        model: this.model,
        schema: schema,
        tabPanelClassName: function() {
          return 'sub-node-form col-sm-12';
        },
        events: {
          'keydown': function (event) {
            let preferences = pgWindow.default.pgAdmin.Browser.get_preferences_for_module('browser');
            if(preferences && keyboardShortcuts.validateShortcutKeys(preferences.add_grid_row,event)) {
              pgBrowser.keyboardNavigation.bindAddGridRow();
            }
          },
        },
      });

      this.objectView.render();

      return this;
    },
    createDialog: function(noofcol) {
      noofcol = noofcol || 1;
      var $dialog = this.$dialog = $(this.modalTemplate({
          title: '',
        })),
        tr = $('<tr class="nohover editor-row">'),
        td = $('<td>', {
          class: 'editable sortable renderable',
          style: 'height: auto',
          colspan: noofcol + 2,
        }).appendTo(tr);

      this.tr = tr;

      // Show the Bootstrap modal dialog
      td.append($dialog.css('display', 'block'));
      this.el.parent('tr').after(tr);

      return $dialog;
    },
    save: function() {
      // Retrieve values from the form, and store inside the object model
      this.model.trigger('backgrid:edited', this.model, this.column, new Backgrid.Command({
        keyCode: 13,
      }));
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
    },
  });

  Backgrid.Extension.PGSelectCell = Backgrid.SelectCell.extend({
    // It's possible to render an option group or use a
    // function to provide option values too.
    optionValues: function() {
      var res = [],
        opts = _.result(this.column.attributes, 'options');
      _.each(opts, function(o) {
        res.push([o.label, o.value]);
      });
      return res;
    },
  });

  Backgrid.Extension.ObjectCell = Backgrid.Cell.extend({
    editorOptionDefaults: {
      schema: [],
    },
    className: 'edit-cell',
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
      editorOptions['el'].attr('tabindex', 0);

      this.listenTo(this.model, 'backgrid:edit', function(model, column, sel_cell, editor) {
        if (column.get('name') == this.column.get('name'))
          editor.extendWithOptions(editorOptions);
      });
      // Listen for Tab key, open subnode dialog on space key
      this.$el.on('keydown', function(e) {
        if (e.keyCode == 32) {
          $(this).click();
        }
      });
    },
    enterEditMode: function() {
      // Notify that we are about to enter in edit mode for current cell.
      // We will check if this row is editable first
      var canEditRow = (!_.isUndefined(this.column.get('canEditRow')) &&
          _.isFunction(this.column.get('canEditRow'))) ?
        Backgrid.callByNeed(this.column.get('canEditRow'),
          this.column, this.model) : true;
      if (canEditRow) {
        // Notify that we are about to enter in edit mode for current cell.
        this.model.trigger('enteringEditMode', [this]);

        Backgrid.Cell.prototype.enterEditMode.apply(this, arguments);
        /* Make sure - we listen to the click event */
        this.delegateEvents();
        var editable = Backgrid.callByNeed(this.column.editable(), this.column, this.model);

        if (editable) {
          this.$el.html(
            '<i class=\'fa fa-pen-square subnode-edit-in-process\' title=\'' + gettext('Edit row') +  '\' aria-label=\'' + gettext('Edit row') +  '\'></i>'
          );
          let body = $(this.$el).parents()[1],
            container = $(body).find('.tab-content:first > .tab-pane.active:first');
          commonUtils.findAndSetFocus(container);
          pgBrowser.keyboardNavigation.getDialogTabNavigator($(body).find('.subnode-dialog'));
          this.model.trigger(
            'pg-sub-node:opened', this.model, this
          );
        }
      } else {
        Alertify.alert(gettext('Edit object'), gettext('This object is not user editable.'),
          function() {
            return true;
          });
      }
    },
    render: function() {
      this.$el.empty();
      this.$el.html('<i class=\'fa fa-edit\' title=\'' + gettext('Edit row') + '\' aria-label=\'' + gettext('Edit row') +  '\'></i>');
      this.delegateEvents();
      if (this.grabFocus)
        this.$el.trigger('focus');
      return this;
    },
    exitEditMode: function() {
      if(!_.isUndefined(this.currentEditor) || !_.isEmpty(this.currentEditor)) {
        var index = $(this.currentEditor.objectView.el)
          .find('.nav-tabs > .active > a[data-toggle="tab"]').first()
          .data('tabIndex');
        Backgrid.Cell.prototype.exitEditMode.apply(this, arguments);
        this.model.trigger(
          'pg-sub-node:closed', this, index
        );
        this.grabFocus = true;
      }
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
      },
      'keydown': function(e) {
        var model = this.model;
        var column = this.column;
        var command = new Backgrid.Command(e);

        if (command.moveLeft()) {
          setTimeout(function() {
            model.trigger('backgrid:edited', model, column, command);
          }, 20);
        }
      },
    },
  });

  Backgrid.Extension.DeleteCell = Backgrid.Cell.extend({
    defaults: _.defaults({
      defaultDeleteMsg: gettext('Are you sure you wish to delete this row?'),
      defaultDeleteTitle: gettext('Delete Row'),
    }, Backgrid.Cell.prototype.defaults),

    /** @property */
    className: 'delete-cell',
    events: {
      'click': 'deleteRow',
    },
    deleteRow: function(e) {
      e.preventDefault();
      var that = this;
      // We will check if row is deletable or not
      var canDeleteRow = (!_.isUndefined(this.column.get('canDeleteRow')) &&
          _.isFunction(this.column.get('canDeleteRow'))) ?
        Backgrid.callByNeed(this.column.get('canDeleteRow'),
          this.column, this.model) : true;
      if (canDeleteRow) {
        var delete_msg = !_.isUndefined(this.column.get('customDeleteMsg')) ?
          this.column.get('customDeleteMsg') : that.defaults.defaultDeleteMsg;
        var delete_title = !_.isUndefined(this.column.get('customDeleteTitle')) ?
          this.column.get('customDeleteTitle') : that.defaults.defaultDeleteTitle;
        Alertify.confirm(
          delete_title,
          delete_msg,
          function() {
            let tbody = $(that.el).parents('tbody').eq(0);
            that.model.collection.remove(that.model);
            let row = $(tbody).find('tr');
            if(row.length > 0) {
              // set focus to first tr
              row.first().children()[0].focus();
            } else {
              // set focus to add button
              $(tbody).parents('.subnode').eq(0).find('.add').focus();
            }
          },
          function() {
            return true;
          }
        );
      } else {
        Alertify.alert(gettext('Delete object'), gettext('This object cannot be deleted.'),
          function() {
            return true;
          }
        );
      }
    },
    exitEditMode: function() {
      this.$el.removeClass('editor');
    },
    initialize: function() {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);
    },
    render: function() {
      var self = this;
      this.$el.empty();
      $(this.$el).attr('tabindex', 0);
      this.$el.html('<i aria-label="' + gettext('Delete row') + '" class=\'fa fa-trash-alt\' title=\'' + gettext('Delete row') + '\'></i>');
      // Listen for Tab/Shift-Tab key
      this.$el.on('keydown', function(e) {
        // with keyboard navigation on space key, mark row for deletion
        if (e.keyCode == 32) {
          self.$el.click();
        }
        var gotoCell;
        if (e.keyCode == 9 || e.keyCode == 16) {
          // go to Next Cell & if Shift is also pressed go to Previous Cell
          gotoCell = e.shiftKey ? self.$el.prev() : self.$el.next();
        }

        if (gotoCell) {
          let command = new Backgrid.Command({
            key: 'Tab',
            keyCode: 9,
            which: 9,
            shiftKey: e.shiftKey,
          });
          setTimeout(function() {
            // When we have Editable Cell
            if (gotoCell.hasClass('editable')) {
              e.preventDefault();
              e.stopPropagation();
              self.model.trigger('backgrid:edited', self.model,
                self.column, command);
            }
            else {
              // When we have Non-Editable Cell
              self.model.trigger('backgrid:edited', self.model,
                self.column, command);
            }
          }, 20);
        }
      });


      this.delegateEvents();
      return this;
    },
  });


  Backgrid.Extension.ClearCell = Backgrid.Cell.extend({
    defaults: _.defaults({
      defaultClearMsg: gettext('Are you sure you wish to clear this row?'),
      defaultClearTitle: gettext('Clear Row'),
    }, Backgrid.Cell.prototype.defaults),

    /** @property */
    className: 'clear-cell',
    events: {
      'click': 'clearRow',
    },
    clearRow: function(e) {
      e.preventDefault();
      if (_.isEmpty(e.currentTarget.innerHTML)) return false;
      var that = this;
      // We will check if row is deletable or not

      var clear_msg = !_.isUndefined(this.column.get('customClearMsg')) ?
        this.column.get('customClearMsg') : that.defaults.defaultClearMsg;
      var clear_title = !_.isUndefined(this.column.get('customClearTitle')) ?
        this.column.get('customClearTitle') : that.defaults.defaultClearTitle;
      Alertify.confirm(
        clear_title,
        clear_msg,
        function() {
          that.model.set('name', null);
          that.model.set('sql', null);
        },
        function() {
          return true;
        }
      );

    },
    exitEditMode: function() {
      this.$el.removeClass('editor');
    },
    initialize: function() {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);
    },
    render: function() {
      var self = this;
      this.$el.empty();
      $(this.$el).attr('tabindex', 0);
      if (this.model.get('name') !== null && this.model.get('sql') !== null)
        this.$el.html('<i aria-label="' + gettext('Clear row') + '" class=\'fa fa-eraser\' title=\'' + gettext('Clear row') + '\'></i>');
      // Listen for Tab/Shift-Tab key
      this.$el.on('keydown', function(e) {
        // with keyboard navigation on space key, mark row for deletion
        if (e.keyCode == 32) {
          self.$el.click();
        }
        var gotoCell;
        if (e.keyCode == 9 || e.keyCode == 16) {
          // go to Next Cell & if Shift is also pressed go to Previous Cell
          gotoCell = e.shiftKey ? self.$el.prev() : self.$el.next();
        }

        if (gotoCell) {
          let command = new Backgrid.Command({
            key: 'Tab',
            keyCode: 9,
            which: 9,
            shiftKey: e.shiftKey,
          });
          setTimeout(function() {
            // When we have Editable Cell
            if (gotoCell.hasClass('editable')) {
              e.preventDefault();
              e.stopPropagation();
              self.model.trigger('backgrid:edited', self.model,
                self.column, command);
            }
            else {
              // When we have Non-Editable Cell
              self.model.trigger('backgrid:edited', self.model,
                self.column, command);
            }
          }, 20);
        }
      });


      this.delegateEvents();
      return this;
    },
  });


  Backgrid.Extension.CustomHeaderCell = Backgrid.HeaderCell.extend({
    initialize: function() {
      // Here, we will add custom classes to header cell
      Backgrid.HeaderCell.prototype.initialize.apply(this, arguments);
      var getClassName = this.column.get('cellHeaderClasses');
      var getAriaLabel = this.column.get('cellAriaLabel');
      if (getClassName) {
        this.$el.addClass(getClassName);
      }
      if (getAriaLabel) {
        this.$el.attr('aria-label', getAriaLabel);
      }
    },
    render: function() {
      Backgrid.HeaderCell.prototype.render.apply(this, arguments);
      // If table header label is not present then screen reader will raise
      // an error we will add span for screen reader only
      if (this.column.get('label') == '' || !this.column.get('label')) {
        let getAriaLabel = this.column.get('cellAriaLabel');
        if (getAriaLabel)
          this.$el.append(`<span class="sr-only">${getAriaLabel}</span>`);
      }
      return this;
    },
  });

  /**
    SwitchCell renders a Bootstrap Switch in backgrid cell
  */
  if (window.jQuery && window.jQuery.fn.bootstrapToggle)
    $.fn.bootstrapToggle = window.jQuery.fn.bootstrapToggle;

  Backgrid.Extension.SwitchCell = Backgrid.BooleanCell.extend({
    defaults: {
      options: _.defaults({
        onText: gettext('Yes'),
        offText: gettext('No'),
        onColor: 'success',
        offColor: 'ternary',
        size: 'mini',
        width: null,
        height: null,
      }, $.fn.bootstrapToggle.defaults),
    },

    className: 'switch-cell',

    initialize: function() {
      Backgrid.BooleanCell.prototype.initialize.apply(this, arguments);
      this.onChange = this.onChange.bind(this);
    },

    enterEditMode: function() {
      this.$el.addClass('editor');
      $(this.$el.find('.toggle.btn')).trigger('focus');
    },

    exitEditMode: function() {
      this.$el.removeClass('editor');
    },

    events: {
      'change input': 'onChange',
      'blur input': 'exitEditMode',
      'keydown': 'onKeyDown',
    },

    onKeyDown: function(e) {
      let preferences = pgWindow.default.pgAdmin.Browser.get_preferences_for_module('browser');
      if(keyboardShortcuts.validateShortcutKeys(preferences.add_grid_row,e)) {
        pgBrowser.keyboardNavigation.bindAddGridRow();
      }
    },

    onChange: function() {
      var model = this.model,
        column = this.column,
        val = this.formatter.toRaw(this.$input.prop('checked'), model);

      this.enterEditMode();
      // on bootstrap change we also need to change model's value
      model.set(column.get('name'), val);
      this.setSrValue();
    },
    setSrValue: function() {
      let {onText, offText} = _.defaults({}, this.column.get('options'), this.defaults.options);
      if(this.$el.find('.toggle.btn').hasClass('off')) {
        this.$el.find('.sr-value').text(`
          ${offText}, ${gettext('Toggle button')}
        `);
      } else {
        this.$el.find('.sr-value').text(`
          ${onText}, ${gettext('Toggle button')}
        `);
      }
    },
    render: function() {
      var self = this,
        col = _.defaults(this.column.toJSON(), this.defaults),
        model = this.model,
        column = this.column,
        rawValue = this.formatter.fromRaw(
          model.get(column.get('name')), model
        ),
        editable = Backgrid.callByNeed(col.editable, column, model),
        options =  _.defaults({}, col.options, this.defaults.options),
        cId = _.uniqueId('pgC_');

      this.undelegateEvents();

      this.$el.empty();
      this.$el.append('<label class="sr-value sr-only" for="' + cId + '"></label>');
      this.$el.append(
        $('<input>', {
          tabIndex: -1,
          type: 'checkbox',
          'aria-hidden': 'true',
          'aria-label': column.get('name'),
        }).prop('checked', rawValue).prop('disabled', !editable).attr('data-toggle', 'toggle')
          .attr('data-size', options.size).attr('data-on', options.onText).attr('data-off', options.offText)
          .attr('data-width', options.width).attr('data-height', options.height)
          .attr('data-onstyle', options.onColor).attr('data-offstyle', options.offColor));

      this.$input = this.$el.find('input[type=checkbox]').first();

      // Override BooleanCell checkbox with Bootstraptoggle
      this.$input.bootstrapToggle();

      this.$el.find('.toggle.btn')
        .attr('tabindex', !editable ? '-1' : '0')
        .attr('id', cId)
        .on('keydown', function(e) {
          if (e.keyCode == 32) {
            self.$el.find('input[type=checkbox]').bootstrapToggle('toggle');
            e.preventDefault();
            e.stopPropagation();
            self.setSrValue();
          }
        });

      this.$el.find('.toggle.btn .toggle-group .btn').attr('aria-hidden', true);
      this.setSrValue();
      // Listen for Tab key
      this.$el.on('keydown', function(e) {
        var gotoCell;
        if (e.keyCode == 9) {
          // go to Next Cell & if Shift is also pressed go to Previous Cell
          gotoCell = e.shiftKey ? self.$el.prev() : self.$el.next();
        }

        if (gotoCell && gotoCell.length > 0) {
          if(gotoCell.hasClass('editable')){
            e.preventDefault();
            e.stopPropagation();
          }
          let command = new Backgrid.Command({
            key: 'Tab',
            keyCode: 9,
            which: 9,
            shiftKey: e.shiftKey,
          });
          setTimeout(function() {
            // When we have Editable Cell
            if (gotoCell.hasClass('editable') && gotoCell.hasClass('edit-cell')) {
              gotoCell.trigger('focus');
            } else if (gotoCell.hasClass('editable')) {
              setTimeout(function() {
                self.model.trigger('backgrid:edited', self.model,
                  self.column, command);
              }, 10);
              gotoCell.trigger('focus');
            } else {
              // When we have Non-Editable Cell
              setTimeout(function() {
                self.model.trigger('backgrid:edited', self.model,
                  self.column, command);
              }, 10);
            }
          }, 20);
        }

      });

      this.delegateEvents();

      return this;
    },
  });

  /*
   *  Select2Cell for backgrid.
   */
  Backgrid.Extension.Select2Cell = Backgrid.SelectCell.extend({
    className: 'select2-cell',

    /** @property */
    editor: null,

    defaults: _.defaults({
      select2: {},
      opt: {
        label: null,
        value: null,
        selected: false,
      },
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
      this.$el.find('.select2-selection').trigger('focus');
    },

    saveOrCancel: function (e) {
      var self = this;

      var command = new Backgrid.Command(e);
      var blurred = e.type === 'blur';

      if (command.moveUp() || command.moveDown() || command.moveLeft() || command.moveRight() ||
          command.save() || blurred) {

        let gotoCell;
        // go to Next Cell & if Shift is also pressed go to Previous Cell
        if (e.keyCode == 9 || e.keyCode == 16) {
          gotoCell = e.shiftKey ? self.$el.prev() : self.$el.next();
          if (self.$el.next().length == 0){
            setTimeout(function() {
              self.$el.find('.select2-selection').blur();
            }, 100);

          }
        }

        if (gotoCell) {
          let cmd = new Backgrid.Command({
            key: 'Tab',
            keyCode: 9,
            which: 9,
            shiftKey: e.shiftKey,
          });
          setTimeout(function() {
            // When we have Editable Cell
            if (gotoCell.hasClass('editable')) {
              e.preventDefault();
              e.stopPropagation();
              self.model.trigger('backgrid:edited', self.model,
                self.column, cmd);
            }
            else {
              // When we have Non-Editable Cell
              self.model.trigger('backgrid:edited', self.model,
                self.column, cmd);
            }
          }, 20);
        }
      }
    },
    events: {
      'select2:open': 'enterEditMode',
      'select2:close': 'exitEditMode',
      'change': 'onSave',
      'select2:unselect': 'onSave',
      'blur': 'saveOrCancel',
      'keydown': 'saveOrCancel',
    },
    /** @property {function(Object, ?Object=): string} template */
    template: _.template([
      '<option value="<%- value %>" ',
      '<%= selected ? \'selected="selected"\' : "" %>>',
      '<%- label %></option>',
    ].join(''),
    null, {
      variable: null,
    }),

    initialize: function() {
      Backgrid.SelectCell.prototype.initialize.apply(this, arguments);
      this.onSave = this.onSave.bind(this);
      this.enterEditMode = this.enterEditMode.bind(this);
      this.exitEditMode = this.exitEditMode.bind(this);
    },

    render: function() {
      var col = _.defaults(this.column.toJSON(), this.defaults),
        model = this.model,
        column = this.column,
        editable = Backgrid.callByNeed(col.editable, column, model),
        optionValues = _.clone(this.optionValues ||
          (_.isFunction(this.column.get('options')) ?
            (this.column.get('options'))(this) :
            this.column.get('options')));

      this.undelegateEvents();

      if (this.$select) {
        if (this.$select.data('select2')) {
          this.$select.select2('destroy');
        }
        delete this.$select;
        this.$select = null;
      }

      this.$el.empty();

      if (!_.isArray(optionValues))
        throw new TypeError('optionValues must be an array');

      var optionText = null,
        optionValue = null,
        self = this,
        selectedValues = model.get(this.column.get('name')),
        select2_opts = _.extend({
          openOnEnter: false,
          multiple: false,
          showOnScroll: true,
          first_empty: true,
        }, self.defaults.select2,
        (col.select2 || {})
        ),
        selectTpl = _.template('<select <%=multiple ? "multiple" : "" %>></select>');

      var $select = self.$select = $(selectTpl({
        multiple: select2_opts.multiple,
      })).appendTo(self.$el);

      /*
       * Add empty option as Select2 requires any empty '<option><option>' for
       * some of its functionality to work.
       */
      if(select2_opts.first_empty) {
        optionValues.unshift(this.defaults.opt);
      }
      for (var i = 0; i < optionValues.length; i++) {
        var opt = optionValues[i];

        if (_.isArray(opt)) {

          optionText = opt[0];
          optionValue = opt[1];

          $select.append(
            self.template({
              label: optionText,
              value: optionValue,
              selected: (selectedValues == optionValue) ||
                (select2_opts.multiple && _.indexOf(selectedValues, optionValue) > -1),
            }));
        } else {
          opt = _.defaults({}, opt, {
            selected: ((selectedValues == opt.value) ||
              (select2_opts.multiple && _.indexOf(selectedValues, opt.value) > -1)),
          }, self.defaults.opt);
          $select.append(self.template(opt));
        }
      }

      if (col && _.has(col.disabled)) {
        var evalF = function() {
          var args = [];
          Array.prototype.push.apply(args, arguments);
          var f = args.shift();

          if (typeof(f) === 'function') {
            return f.apply(self, args);
          }
          return f;
        };
        _.extend(select2_opts, {
          disabled: evalF(col.disabled, col, model),
        });
      } else {
        _.extend(select2_opts, {
          disabled: !editable,
        });
      }

      this.delegateEvents();

      // If disabled then no need to show placeholder
      if (!editable || col.mode === 'properties') {
        select2_opts['placeholder'] = '';
      }

      /* Configure show on scroll if required */
      select2_opts = configure_show_on_scroll.default(select2_opts);

      // Initialize select2 control.
      this.$sel = this.$select.select2(select2_opts);

      // Select the highlighted item on Tab press.
      if (this.$sel) {
        this.$sel.data('select2').on('keypress', function(ev) {
          var ctx = this;

          // keycode 9 is for TAB key
          if (ev.which === 9 && ctx.isOpen()) {
            ctx.trigger('results:select', {});
            ev.preventDefault();
          }
        });
      }

      return this;
    },

    /**
         Saves the value of the selected option to the model attribute.
         */
    onSave: function() {
      var model = this.model;
      var column = this.column;

      model.set(column.get('name'), this.$select.val());
    },

    remove: function() {
      this.$select.off('change', this.onSave);
      if (this.$select.data('select2')) {
        this.$select.select2('destroy');
      }
      this.$el.empty();
      Backgrid.SelectCell.prototype.remove.apply(this, arguments);
    },
  });

  /**
    TextareaCellEditor the cell editor renders a textarea multi-line text input
    box as its editor.

    @class Backgrid.TextareaCellEditor
    @extends Backgrid.InputCellEditor
  */
  var TextareaCellEditor = Backgrid.TextareaCellEditor = Backgrid.InputCellEditor.extend({
    /** @property */
    tagName: 'textarea',

    events: {
      'blur': 'saveOrCancel',
      'keydown': '',
    },
  });

  /**
    TextareaCell displays multiline HTML strings.

      @class Backgrid.Extension.TextareaCell
      @extends Backgrid.Cell
  */
  Backgrid.Extension.TextareaCell = Backgrid.Cell.extend({
    /** @property */
    className: 'textarea-cell',

    editor: TextareaCellEditor,
  });


  /**
   * Custom header icon cell to add the icon in table header.
   */
  Backgrid.Extension.CustomHeaderIconCell = Backgrid.HeaderCell.extend({
    /** @property */
    className: 'header-icon-cell',
    events: {
      'click': 'addHeaderIcon',
    },
    addHeaderIcon: function(e) {
      this.collection.add(
        new(this.collection.model)
      );
      e.preventDefault();
    },
    render: function() {
      this.$el.empty();
      this.$el.html('<label><a><span style=\'font-weight:normal;\'>' + gettext('Array Values') + '</a></span></label> <button class=\'btn-sm btn-secondary add\'>' + gettext('Add') + '</button>');
      this.delegateEvents();
      return this;
    },
  });

  var arrayCellModel = Backbone.Model.extend({
    defaults: {
      value: null,
    },
  });

  /**
     Custom InputArrayCellEditor for editing user input array for debugger.
   */
  var InputArrayCellEditor = Backgrid.Extension.InputArrayCellEditor =
    Backgrid.CellEditor.extend({
      tagName: 'div',

      events: {
        'blur': 'lostFocus',
      },

      render: function() {
        var self = this,
          arrayValuesCol = this.model.get(this.column.get('name')),
          cell_type = 'string';

        var data_type = this.model.get('type').replace('[]' ,'');
        switch (data_type) {
        case 'boolean':
          cell_type = 'boolean';
          break;
        case 'integer':
        case 'smallint':
        case 'bigint':
        case 'serial':
        case 'smallserial':
        case 'bigserial':
        case 'oid':
        case 'cid':
        case 'xid':
        case 'tid':
          cell_type = 'integer';
          break;
        case 'real':
        case 'numeric':
        case 'double precision':
        case 'decimal':
          cell_type = 'number';
          break;
        case 'date':
          cell_type = 'date';
          break;
        }

        var gridCols = [{
            name: 'value',
            label: gettext('Array Values'),
            type: 'text',
            cell: cell_type,
            headerCell: Backgrid.Extension.CustomHeaderIconCell,
            cellHeaderClasses: 'width_percent_100',
          }],
          gridBody = $('<div class=\'pgadmin-control-group backgrid form-group col-12 object subnode\'></div>');

        this.$el.attr('tabindex', '1');

        gridCols.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: Backgrid.Extension.DeleteCell,
          //headerCell: Backgrid.Extension.CustomHeaderIconCell,
          editable: false,
          cell_priority: -1,
        });

        this.$el.empty();
        var grid = self.grid = new Backgrid.Grid({
          columns: gridCols,
          collection: arrayValuesCol,
        });

        this.grid.listenTo(arrayValuesCol, 'backgrid:error',
          (function(obj) {
            return function(ev) {
              obj.model.trigger('backgrid:error', obj.model, obj.column, new Backgrid.Command(ev));
            };
          })(this)
        );

        this.grid.listenTo(arrayValuesCol, 'backgrid:edited',
          (function(obj) {
            return function(ev) {
              obj.model.trigger('backgrid:edited', obj.model, obj.column, new Backgrid.Command(ev));
            };
          })(this)
        );

        grid.render();

        gridBody.append(grid.$el);

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
          isDescendant = function(parent, child) {
            var node = child.parentNode;
            while (node != null) {
              if (node == parent) {
                return true;
              }
              node = node.parentNode;
            }
            return false;
          };
        /*
         * Between leaving the old element focus and entering the new element focus the
         * active element is the document/body itself so add timeout to get the proper
         * focused active element.
         */
        setTimeout(function() {
          if (self.$el[0] != document.activeElement && !isDescendant(self.$el[0], document.activeElement)) {
            var m = self.model,
              column = self.column;
            m.trigger('backgrid:edited', m, column, new Backgrid.Command(ev));

            setTimeout(function() {
              if (self.grid) {
                self.grid.remove();
                self.grid = null;
              }
            }, 10);
          }
        }, 10);
        return;
      },
    });

  /*
   * This will help us transform the user input string array values in proper format to be
   * displayed in the cell.
   */
  var InputStringArrayCellFormatter = Backgrid.Extension.InputStringArrayCellFormatter =
    function() {};
  _.extend(InputStringArrayCellFormatter.prototype, {
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function(rawData) {
      var values = [];
      rawData.each(function(m) {
        var val = m.get('value');
        if (_.isUndefined(val)) {
          values.push('null');
        } else {
          values.push(m.get('value'));
        }
      });
      return values.toString();
    },
    toRaw: function(formattedData) {
      return formattedData;
    },
  });

  /*
   * This will help us transform the user input integer array values in proper format to be
   * displayed in the cell.
   */
  var InputIntegerArrayCellFormatter = Backgrid.Extension.InputIntegerArrayCellFormatter =
    function() {};
  _.extend(InputIntegerArrayCellFormatter.prototype, {
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function(rawData) {
      var values = [];
      rawData.each(function(m) {
        var val = m.get('value');
        if (_.isUndefined(val) || _.isNull(val)) {
          values.push('NULL');
        } else {
          values.push(m.get('value'));
        }
      });
      return values.toString();
    },
    toRaw: function(formattedData) {
      formattedData.each(function(m) {
        m.set('value', parseInt(m.get('value')), {
          silent: true,
        });
      });

      return formattedData;
    },
  });

  /*
   * This will help us transform the user input numeric array values in proper format to be
   * displayed in the cell.
   */
  var InputNumberArrayCellFormatter= Backgrid.Extension.InputNumberArrayCellFormatter =
    function() {};
  _.extend(InputNumberArrayCellFormatter.prototype, {
    /**
     * Takes a raw value from a model and returns an optionally formatted
     * string for display.
     */
    fromRaw: function(rawData) {
      var values = [];
      rawData.each(function(m) {
        var val = m.get('value');
        if (_.isUndefined(val) || _.isNull(val)) {
          values.push('NULL');
        } else {
          values.push(m.get('value'));
        }
      });
      return values.toString();
    },
    toRaw: function(formattedData) {
      formattedData.each(function(m) {
        m.set('value', parseFloat(m.get('value')), {
          silent: true,
        });
      });

      return formattedData;
    },
  });

  /*
   *  InputStringArrayCell for rendering and taking input for string array type in debugger
   */
  Backgrid.Extension.InputStringArrayCell = Backgrid.Cell.extend({
    className: 'width_percent_25',
    formatter: InputStringArrayCellFormatter,
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.Cell.prototype.initialize.apply(this, arguments);
      // set value to empty array.
      var m = arguments[0].model;
      if (_.isUndefined(this.collection)) {
        this.collection = new(Backbone.Collection.extend({
          model: arrayCellModel,
        }))(m.get('value'));
      }

      this.model.set(this.column.get('name'), this.collection);
      this.listenTo(this.collection, 'remove', this.render);
    },
  });

  /*
   *  InputIntegerArrayCell for rendering and taking input for integer array type in debugger
   */
  Backgrid.Extension.InputIntegerArrayCell = Backgrid.IntegerCell.extend({
    className: 'width_percent_25',
    formatter: InputIntegerArrayCellFormatter,
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.IntegerCell.prototype.initialize.apply(this, arguments);
      // set value to empty array.
      var m = arguments[0].model;
      _.each(m.get('value'), function(arrVal) {
        if (arrVal.value === 'NULL') {
          arrVal.value = null;
        }
      });

      if (_.isUndefined(this.collection)) {
        this.collection = new(Backbone.Collection.extend({
          model: arrayCellModel,
        }))(m.get('value'));
      }

      this.model.set(this.column.get('name'), this.collection);
      this.listenTo(this.collection, 'remove', this.render);
    },
  });

  /*
   *  InputNumberArrayCell for rendering and taking input for numeric array type in debugger
   */
  Backgrid.Extension.InputNumberArrayCell = Backgrid.NumberCell.extend({
    className: 'width_percent_25',
    formatter: InputNumberArrayCellFormatter,
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.NumberCell.prototype.initialize.apply(this, arguments);
      // set value to empty array.
      var m = arguments[0].model;
      _.each(m.get('value'), function(arrVal) {
        if (arrVal.value === 'NULL') {
          arrVal.value = null;
        }
      });

      if (_.isUndefined(this.collection)) {
        this.collection = new(Backbone.Collection.extend({
          model: arrayCellModel,
        }))(m.get('value'));
      }

      this.model.set(this.column.get('name'), this.collection);
      this.listenTo(this.collection, 'remove', this.render);
    },
  });

  /*
   *  InputBooleanArrayCell for rendering and taking input for boolean array type in debugger
   */
  Backgrid.Extension.InputBooleanArrayCell = Backgrid.BooleanCell.extend({
    className: 'width_percent_25',
    editor: InputArrayCellEditor,

    initialize: function() {
      Backgrid.BooleanCell.prototype.initialize.apply(this, arguments);
      // set value to empty array.
      var m = arguments[0].model;
      if (_.isUndefined(this.collection)) {
        this.collection = new(Backbone.Collection.extend({
          model: arrayCellModel,
        }))(m.get('value'));
      }

      this.model.set(this.column.get('name'), this.collection);
      this.listenTo(this.collection, 'remove', this.render);
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
      initialize: function() {
        // Listen to the dependent fields in the model for any change
        var deps = this.column.get('deps');
        var self = this;

        if (deps && _.isArray(deps)) {
          _.each(deps, function(d) {
            var attrArr = d.split('.'),
              name = attrArr.shift();
            self.listenTo(self.model, 'change:' + name, self.dependentChanged);
          });
        }
      },
      remove: function() {
        // Remove the events for the dependent fields in the model
        var self = this,
          deps = self.column.get('deps');

        if (deps && _.isArray(deps)) {
          _.each(deps, function(d) {
            var attrArr = d.split('.'),
              name = attrArr.shift();

            self.stopListening(self.model, 'change:' + name, self.dependentChanged);
          });
        }
      },
    });

  /**
   Formatter for PasswordCell.

   @class Backgrid.PasswordFormatter
   @extends Backgrid.CellFormatter
   @constructor
  */
  var PasswordFormatter = Backgrid.PasswordFormatter = function() {};
  PasswordFormatter.prototype = new Backgrid.CellFormatter();
  _.extend(PasswordFormatter.prototype, {
    fromRaw: function(rawValue) {

      if (_.isUndefined(rawValue) || _.isNull(rawValue)) return '';

      var pass = '';
      for (var i = 0; i < rawValue.length; i++) {
        pass += '*';
      }
      return pass;
    },
  });

  Backgrid.Extension.PasswordCell = Backgrid.StringCell.extend({

    formatter: PasswordFormatter,

    editor: Backgrid.InputCellEditor.extend({
      attributes: {
        type: 'password',
        autocomplete: 'new-password',
      },

      render: function() {
        var model = this.model;
        this.$el.val(model.get(this.column.get('name')));
        return this;
      },
    }),
  });

  /*
   * Override NumberFormatter to support NaN, Infinity values.
   * On client side, JSON do not directly support NaN & Infinity,
   * we explicitly converted it into string format at server side
   * and we need to parse it again in float at client side.
   */
  _.extend(Backgrid.NumberFormatter.prototype, {
    fromRaw: function(number) {
      if (_.isNull(number) || _.isUndefined(number)) return '';

      number = parseFloat(number).toFixed(~~this.decimals);

      var parts = number.split('.');
      var integerPart = parts[0];
      var decimalPart = parts[1] ? (this.decimalSeparator || '.') + parts[1] : '';

      return integerPart.replace(this.HUMANIZED_NUM_RE, '$1' + this.orderSeparator) + decimalPart;
    },
  });

  /*
   *  JSONBCell Formatter.
   */
  var JSONBCellFormatter = Backgrid.Extension.JSONBCellFormatter =
    function() {};
  _.extend(JSONBCellFormatter.prototype, {
    fromRaw: function(rawData) {
      // json data
      if (_.isArray(rawData)) {
        var converted_data = '';
        converted_data = _.map(rawData, function(data) {
          return JSON.stringify(JSON.stringify(data));
        });
        return '{' + converted_data.join() + '}';
      } else if (_.isObject(rawData)) {
        return JSON.stringify(rawData);
      } else {
        return rawData;
      }
    },
    toRaw: function(formattedData) {
      return formattedData;
    },
  });

  /*
   *  JSONBCell for backgrid.
   */
  Backgrid.Extension.JSONBCell =
    Backgrid.StringCell.extend({
      className: 'jsonb-cell',
      formatter: JSONBCellFormatter,
    });

  var DatepickerCellEditor = Backgrid.InputCellEditor.extend({
    events: {},
    initialize: function() {
      Backgrid.InputCellEditor.prototype.initialize.apply(this, arguments);
      var input = this;
      $(this.el).prop('readonly', true);
      $(this.el).datepicker({
        onClose: function(newValue) {
          var command = new Backgrid.Command({});
          input.model.set(input.column.get('name'), newValue);
          input.model.trigger(
            'backgrid:edited', input.model, input.column, command
          );
          input = null;
        },
      });
    },
  });

  Backgrid.Extension.DatepickerCell = Backgrid.Cell.extend({
    editor: DatepickerCellEditor,
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
  var MomentFormatter = Backgrid.Extension.MomentFormatter = function(options) {
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
      allowEmpty: false,
    },

    /**
       Converts datetime values from the model for display.
       @member Backgrid.Extension.MomentFormatter
       @param {*} rawData
       @return {string}
       */
    fromRaw: function(rawData) {
      if (rawData == null) return '';

      var m = this.modelInUnixOffset ? moment(rawData) :
        this.modelInUnixTimestamp ? moment.unix(rawData) :
          this.modelInUTC ?
            moment.utc(rawData, this.modelFormat, this.modelLang) :
            moment(rawData, this.modelFormat, this.modelLang);

      if (this.displayInUnixOffset) return +m;

      if (this.displayInUnixTimestamp) return m.unix();

      if (this.displayLang) m.locale(this.displayLang);

      if (this.displayInUTC) m.utc();
      else m.local();

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
    toRaw: function(formattedData) {

      var m = this.displayInUnixOffset ? moment(+formattedData) :
        this.displayInUnixTimestamp ? moment.unix(+formattedData) :
          this.displayInUTC ?
            moment.utc(formattedData, this.displayFormat, this.displayLang) :
            moment(formattedData, this.displayFormat, this.displayLang);

      if (!m || !m.isValid()) return (this.allowEmpty && formattedData === '') ? null : undefined;

      if (this.modelInUnixOffset) return +m;

      if (this.modelInUnixTimestamp) return m.unix();

      if (this.modelLang) m.locale(this.modelLang);

      if (this.modelInUTC) m.utc();
      else m.local();

      if (this.modelFormat != moment.defaultFormat) {
        return m.format(this.modelFormat);
      }

      return m.format();
    },
  });

  var MomentCell = Backgrid.Extension.MomentCell = Backgrid.Cell.extend({

    editor: Backgrid.InputCellEditor,

    /** @property */
    className: 'datetime-cell',

    /** @property {Backgrid.CellFormatter} [formatter=Backgrid.Extension.MomentFormatter] */
    formatter: MomentFormatter,

    /**
       Initializer. Accept Backgrid.Extension.MomentFormatter.options and
       Backgrid.Cell.initialize required parameters.
     */
    initialize: function(options) {

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
          placeholder: this.formatter.displayFormat,
        }),
        options: this.column.get('options'),
      });
    },
  });

  Backgrid.Extension.DatetimePickerEditor = Backgrid.InputCellEditor.extend({
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
          format: 'YYYY-MM-DD HH:mm:ss Z',
          icons: {
            time: 'fa fa-clock',
            data: 'fa fa-calendar-alt',
            today: 'fa fa-calendar-check',
            clear: 'fa fa-trash',
          },
          buttons: {
            showToday: true,
          },
          toolbarPlacement: 'top',
          widgetPositioning: {
            horizontal: 'auto',
            vertical: 'bottom',
          },
          keepOpen: false,
        }, evalF(this.column.get('options')), {
          keyBinds: {
            'shift tab': function(widget) {
              if (widget) {
                // blur the input
                setTimeout(
                  function() {
                    self.closeIt({
                      keyCode: 9,
                      shiftKey: true,
                    });
                  }, 10
                );
              }
            },
            tab: function(widget) {
              if (widget) {
                // blur the input
                setTimeout(
                  function() {
                    self.closeIt({
                      keyCode: 9,
                    });
                  }, 10
                );
              }
            },
          },
        });
      this.tabKeyPress = false;
      this.$el.datetimepicker(options);
      this.$el.datetimepicker('show');
      this.picker = this.$el.data('datetimepicker');
    },
    events: {
      'hide.datetimepicker': 'closeIt',
      'focusout':'closeIt',
      'keydown': 'keydownHandler',
    },
    keydownHandler: function(event) {
      let stopBubble = false;
      let self = this;
      if (!event.altKey && event.keyCode == 38){
        let currdate = self.$el.data('datetimepicker').date().clone();
        if (self.$el.data('datetimepicker').widget.find('.datepicker').is(':visible')){
          $(this.el).datetimepicker('date', currdate.subtract(7, 'd'));
        }else{
          $(this.el).datetimepicker('date', currdate.add(7, 'm'));
        }
      }else if (!event.altKey && event.keyCode == 40){
        let currdate = self.$el.data('datetimepicker').date().clone();
        if (self.$el.data('datetimepicker').widget.find('.datepicker').is(':visible')){
          $(this.el).datetimepicker('date', currdate.add(7, 'd'));
        }else{
          $(this.el).datetimepicker('date', currdate.subtract(7, 'm'));
        }
      }else if (event.keyCode == 39){
        let currdate = self.$el.data('datetimepicker').date().clone();
        $(this.el).datetimepicker('date', currdate.add(1, 'd'));
      }else if (event.keyCode == 37){
        let currdate = self.$el.data('datetimepicker').date().clone();
        $(this.el).datetimepicker('date', currdate.subtract(1, 'd'));
      }

      if (event.altKey && event.keyCode == 84){
        if (self.$el.data('datetimepicker').widget.find('.timepicker').is(':visible')){
          self.$el.data('datetimepicker').widget.find('.fa-calendar-alt').click();
        }else{
          self.$el.data('datetimepicker').widget.find('.fa-clock').click();
        }
      }

      if(event.altKey && event.keyCode == 38){
        let currdate = self.$el.data('datetimepicker').date().clone();
        $(this.el).datetimepicker('date', currdate.add(1, 'h'));
      }else if(event.altKey && event.keyCode == 40){
        let currdate = self.$el.data('datetimepicker').date().clone();
        $(this.el).datetimepicker('date', currdate.subtract(1, 'h'));
      }

      if (event.keyCode == 27){
        this.$el.datetimepicker('hide');
        stopBubble = true;
      }

      if(stopBubble) {
        event.stopImmediatePropagation();
      }
      // If Tab key pressed from Cell and not from Datetime picker element
      // then we should trigger edited event so that we can goto next cell
      let tabKeyPressed = true;
      if (event.keyCode === 9 && self.el === event.target) {
        self.closeIt(event, tabKeyPressed);
      }
    },
    closeIt: function(ev, isTabKeyPressed) {
      if (this.is_closing || this.tabKeyPress)
        return;

      this.is_closing = true;
      this.tabKeyPress = isTabKeyPressed;

      var formatter = this.formatter,
        model = this.model,
        column = this.column,
        val = this.$el.val(),
        newValue = formatter.toRaw(val, model);

      this.$el.datetimepicker('destroy');
      this.is_closing = false;

      /* set the model default value in case of empty or undefined */
      if (_.isUndefined(newValue) ||
        String(val).replace(/^\s+|\s+$/g, '') == '') {
        newValue = null;
      }

      model.set(column.get('name'), newValue);
      let command = new Backgrid.Command(ev);
      model.trigger('backgrid:edited', model, column, command);
    },
  });

  _.extend(MomentCell.prototype, MomentFormatter.prototype.defaults);


  Backgrid.Extension.StringDepCell = Backgrid.StringCell.extend({
    initialize: function() {
      Backgrid.StringCell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },
    dependentChanged: function() {
      this.$el.empty();

      var self = this,
        model = this.model,
        column = this.column,
        editable = this.column.get('editable');

      this.render();

      var is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
      setTimeout(function() {
        self.$el.removeClass('editor');
        if (is_editable) {
          self.$el.addClass('editable');
        } else {
          self.$el.removeClass('editable');
        }
      }, 10);

      this.delegateEvents();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });

  Backgrid.Extension.Select2DepCell = Backgrid.Extension.Select2Cell.extend({
    initialize: function() {
      Backgrid.Extension.Select2Cell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },

    dependentChanged: function() {
      var model = this.model,
        column = this.column,
        editable = this.column.get('editable');

      this.render();

      if (
        _.isFunction(editable) ? !!editable.apply(column, [model]) :
          !!editable
      ) {
        this.$el.addClass('editable');
      } else {
        this.$el.removeClass('editable');
      }

      this.delegateEvents();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });

  /* Custom search box was added to give user defined text box for search
   * instead of backgrid rendered textbox
   */
  Backgrid.Extension.ClientSideFilter = Backgrid.Extension.ClientSideFilter.extend({
    $customSearchBox: null,
    template: function (data) {
      return '<span class="search">&nbsp;</span><input type="search" ' + (data.placeholder ? 'aria-label= "' + data.placeholder + '"' : '')+' '+ (data.placeholder ? 'placeholder="' +
      data.placeholder + '"' : '') + ' name="' + data.name + '" ' + (data.value ? 'value="' + data.value + '"' : '') + '/><a class="clear" data-backgrid-action="clear" href="#">&times;</a>';
    },

    searchBox: function() {
      if(this.$customSearchBox) {
        return this.$customSearchBox;
      } else {
        return this.$el.find('input[type=search]');
      }
    },

    setCustomSearchBox: function($el) {
      this.$customSearchBox = $el;
      this.$customSearchBox.attr('type','search');
      this.$customSearchBox.on('keydown', this.search.bind(this));
      this.$customSearchBox.on('mousedown', this.search.bind(this));
      return this;
    },

    unsetCustomSearchBox: function() {
      this.$customSearchBox.off('keydown', this.search.bind(this));
      this.$customSearchBox = null;
      return this;
    },
  });

  var BooleanCellFormatter = Backgrid.BooleanCellFormatter = function() {};
  _.extend(BooleanCellFormatter.prototype, {
    fromRaw: function (rawValue) {
      if (_.isUndefined(rawValue) || _.isNull(rawValue)) {
        return false;
      } else if (rawValue === '1' || rawValue === 'True') {
        return true;
      } else if (rawValue === '0' || rawValue === 'False') {
        return false;
      }
      return rawValue;
    },
    toRaw: function (formattedData) {
      return formattedData;
    },
  });

  Backgrid.BooleanCell = Backgrid.BooleanCell.extend({
    className: 'boolean-cell',

    enterEditMode: function() {
      this.$el.addClass('editor');
      $(this.$el.find('input[type=checkbox]')).trigger('focus');
    },

    exitEditMode: function() {
      this.$el.removeClass('editor');
    },

    events: {
      'change input': 'onChange',
      'blur input': 'exitEditMode',
      'keydown': 'onKeyDown',
    },

    onChange: function(e) {
      var model = this.model,
        column = this.column,
        val = this.formatter.toRaw(this.$input.prop('checked'), model);

      this.enterEditMode();
      // on bootstrap change we also need to change model's value
      model.set(column.get('name'), val);
      model.trigger('backgrid:edited', model, column, new Backgrid.Command(e));
    },

    render: function () {
      this.$el.empty();
      var model = this.model, column = this.column;
      var editable = Backgrid.callByNeed(column.editable(), column, model);
      var align_center = column.get('align_center') || false;
      let checked =  this.formatter.fromRaw(model.get(column.get('name')), model);
      let id = `column.get('name')_${_.uniqueId()}`;

      this.$el.empty();
      this.$el.append(
        $(`<div class="custom-control custom-checkbox custom-checkbox-no-label ${align_center?'text-center':''}">
          <input tabindex="0" type="checkbox" class="custom-control-input" id="${id}" ${!editable?'disabled':''} ${checked?'checked':''}/>
          <label class="custom-control-label" for="${id}">
            <span class="sr-only">` + gettext('Select') + `<span>
          </label>
        </div>`)
      );
      this.$input = this.$el.find('input');
      this.delegateEvents();
      return this;
    },
  });

  Backgrid.Extension.SqlCell = Backgrid.Extension.TextareaCell.extend({
    className: 'sql-cell',
    defaults: {
      lineWrapping: true,
    },
    template: _.template([
      '<div data-toggle="tooltip" data-placement="top" data-html="true" title="<%- val %>"><textarea aria-label="' + gettext('SQL') +'" + style="display: none;"><%- val %></textarea><div>',
    ].join('\n')),

    render: function() {
      let self = this,
        col = _.defaults(this.column.toJSON(), this.defaults),
        model = this.model,
        column = this.column,
        columnName = this.column.get('name'),
        editable = Backgrid.callByNeed(col.editable, column, model);

      if (this.sqlCell) {
        this.sqlCell.toTextArea();
        delete this.sqlCell;
        this.sqlCell = null;
      }

      this.$el.empty();
      this.$el.append(this.template({
        val:this.formatter.fromRaw(model.get(columnName), model),
      })
      );
      this.$el.addClass(columnName);
      this.updateStateClassesMaybe();
      this.delegateEvents();

      setTimeout(function() {
        self.sqlCell = CodeMirror.fromTextArea(
          (self.$el.find('textarea')[0]), {
            mode: 'text/x-pgsql',
            readOnly: !editable,
            singleCursorHeightPerLine: true,
            screenReaderLabel: columnName,
          });
      });

      return this;
    },
    enterEditMode: function () {
      if (!this.$el.hasClass('editor')) this.$el.addClass('editor');
      this.sqlCell.focus();
      this.sqlCell.on('blur', this.exitEditMode.bind(this));
    },
    exitEditMode: function () {
      this.$el.removeClass('editor');
      this.saveOrCancel.apply(this, arguments);
    },
    saveOrCancel: function() {
      var model = this.model;
      var column = this.column;
      if (this.sqlCell) {
        var val = this.sqlCell.getTextArea().value;
        var newValue = this.sqlCell.getValue();
        if (_.isUndefined(newValue)) {
          model.trigger('backgrid:error', model, column, val);
        }
        else {
          model.set(column.get('name'), newValue);
        }
      }
    },
    remove: function() {
      if (this.sqlCell) {
        $(this.$el.find('[data-toggle="tooltip"]')).tooltip('dispose');
        this.sqlCell.toTextArea();
        delete this.sqlCell;
        this.sqlCell = null;
      }
      return Backgrid.Extension.TextareaCell.prototype.remove.apply(this, arguments);
    },
  });

  return Backgrid;

});
