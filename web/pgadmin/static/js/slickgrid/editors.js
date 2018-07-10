/***
 * Contains JSON SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function($) {
  // register namespace
  $.extend(true, window, {
    'Slick': {
      'Editors': {
        'pgText': pgTextEditor,
        'JsonText': JsonTextEditor,
        'CustomNumber': CustomNumberEditor,
        'Checkbox': pgCheckboxEditor,
        // Below editor will read only editors, Just to display data
        'ReadOnlyText': ReadOnlyTextEditor,
        'ReadOnlyCheckbox': ReadOnlyCheckboxEditor,
        'ReadOnlypgText': ReadOnlypgTextEditor,
        'ReadOnlyJsonText': ReadOnlyJsonTextEditor,
      },
    },
  });

  // return wrapper element
  function getWrapper() {
    return $('<div class=\'pg_text_editor\' />');
  }

  // return textarea element
  function getTextArea() {
    return $('<textarea class=\'pg_textarea text-12\' hidefocus rows=5\'>');
  }

  // Generate and return editor buttons
  function getButtons(editable) {
    var $buttons = $('<div class=\'pg_buttons\' />'),
      label = editable ? 'Cancel' : 'OK',
      button_type = editable ? 'btn-danger' : 'btn-primary';

    if (editable) {
      $('<button class=\'btn btn-primary fa fa-lg fa-save long_text_editor pg-alertify-button\'>Save</button>')
        .appendTo($buttons);
    }

    $('<button class=\'btn ' + button_type + ' fa fa-lg fa-times long_text_editor pg-alertify-button\'>' + label + '</button>')
      .appendTo($buttons);
    return $buttons;
  }

  function is_valid_array(val) {
    val = $.trim(val);
    return !(val != '' && (val.charAt(0) != '{' || val.charAt(val.length - 1) != '}'));
  }
  /*
   * This function handles the [default] and [null] values for cells
   * if row is copied, otherwise returns the editor value.
   * @param {args} editor object
   * @param {item} row cell values
   * @param {state} entered value
   * @param {column_type} type of column
   */
  function setValue(args, item, state, column_type) {
    // declare a 2-d array which tracks the status of each updated cell
    // If a cell is edited for the 1st time and state is null,
    // set cell value to [default] and update its status [row][cell] to 1.
    // If same cell is edited again, and kept blank, set cell value to [null]

    // If a row is copied
    var grid = args.grid;
    if (item.is_row_copied) {
      if (!grid.copied_rows) {
        grid.copied_rows = [
          [],
        ];
      }

      var active_cell = grid.getActiveCell(),
        row = active_cell['row'],
        cell = active_cell['cell'],
        last_value = item[args.column.pos];

      last_value = (column_type === 'number') ?
        (_.isEmpty(last_value) || last_value) : last_value;

      item[args.column.field] = state;
      if (last_value && _.isNull(state) &&
        (_.isUndefined(grid.copied_rows[row]) ||
          _.isUndefined(grid.copied_rows[row][cell]))
      ) {
        item[args.column.field] = undefined;
        if (grid.copied_rows[row] == undefined) grid.copied_rows[row] = [];
        grid.copied_rows[row][cell] = 1;
      }
    } else {
      item[args.column.field] = state;
    }
  }

  function calculateEditorPosition(position, $wrapper) {
    var $edit_grid = $wrapper.parent().find('#datagrid');
    var _elem_height = $edit_grid.height(),
      is_hidden, _position;
    // We cannot display editor partially visible so we will lift it above select column
    if (position.top > _elem_height) {
      is_hidden = position.bottom - _elem_height;
    }

    if (is_hidden) {
      _position = position.top - is_hidden;
    } else {
      _position = position.top - 7;
    }
    position.top = _position;

    var grid_width = $edit_grid.width(),
      popup_width = $wrapper.width() + 32;
    popup_width += position.left;

    if (popup_width > grid_width) {
      position.left -= (popup_width - grid_width);
    }
    return position;
  }

  // Text data type editor
  function pgTextEditor(args) {
    var $input, $wrapper, $buttons;
    var defaultValue;
    var scope = this;

    this.init = function() {
      var $container = $('body');

      $wrapper = getWrapper().appendTo($container);
      $input = getTextArea().appendTo($wrapper);
      $buttons = getButtons(true).appendTo($wrapper);

      $buttons.find('button:first').on('click', this.save);
      $buttons.find('button:last').on('click', this.cancel);
      $input.on('keydown', this.handleKeyDown);

      scope.position(args.position);
      $input.trigger('focus').trigger('select');
    };

    this.handleKeyDown = function(e) {
      if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
        scope.save();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
        e.preventDefault();
        args.grid.navigatePrev();
      } else if (e.which == $.ui.keyCode.TAB) {
        e.preventDefault();
        args.grid.navigateNext();
      }
    };

    this.save = function() {
      args.commitChanges();
    };

    this.cancel = function() {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function() {
      $wrapper.hide();
    };

    this.show = function() {
      $wrapper.show();
    };

    this.position = function(position) {
      calculateEditorPosition(position, $wrapper);
      $wrapper
        .css('top', position.top)
        .css('left', position.left);
    };

    this.destroy = function() {
      $wrapper.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    // When text editor opens
    this.loadValue = function(item) {
      if (
        _.isUndefined(item[args.column.field]) ||
        _.isNull(item[args.column.field])
      ) {
        $input.val(defaultValue = '');
        return;
      }

      if (!args.column.is_array) {
        if (item[args.column.field] === '') {
          $input.val(defaultValue = '\'\'');
        } else if (item[args.column.field] === '\'\'') {
          $input.val(defaultValue = '\\\'\\\'');
        } else if (item[args.column.field] === '""') {
          $input.val(defaultValue = '\\"\\"');
        } else {
          $input.val(defaultValue = item[args.column.field]);
          $input.trigger('select');
        }
      } else {
        $input.val(defaultValue = item[args.column.field]);
        $input.trigger('select');
      }
    };

    this.serializeValue = function() {

      var value = $input.val();
      // If empty return null
      if (value === '') {
        return null;
      }

      if (!args.column.is_array) {
        if (value === '\'\'' || value === '""') {
          return '';
        } else if (value === '\\\'\\\'') {
          return '\'\'';
        } else if (value === '\\"\\"') {
          return '""';
        } else {
          return value;
        }
      } else {
        return $.trim(value);
      }
    };

    this.applyValue = function(item, state) {
      setValue(args, item, state, 'text');
    };

    this.isValueChanged = function() {
      // Use _.isNull(value) for comparison for null instead of
      // defaultValue == null, because it returns true for undefined value.
      if ($input.val() == '' && _.isUndefined(defaultValue)) {
        return false;
      } else {
        return (!($input.val() == '' && _.isNull(defaultValue))) &&
          ($input.val() !== defaultValue);
      }
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      if (args.column.is_array && !is_valid_array($input.val())) {
        return {
          valid: false,
          msg: 'Array must start with \'{\' and end with \'}\'',
        };
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  // JSON data type editor
  function JsonTextEditor(args) {
    var $input, $wrapper, $buttons;
    var defaultValue;
    var scope = this;

    this.init = function() {
      var $container = $('body');

      $wrapper = getWrapper().appendTo($container);
      $input = getTextArea().appendTo($wrapper);
      $buttons = getButtons(true).appendTo($wrapper);

      $buttons.find('button:first').on('click', this.save);
      $buttons.find('button:last').on('click', this.cancel);
      $input.on('keydown', this.handleKeyDown);

      scope.position(args.position);
      $input.trigger('focus').trigger('select');
    };

    this.handleKeyDown = function(e) {
      if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
        scope.save();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
        e.preventDefault();
        args.grid.navigatePrev();
      } else if (e.which == $.ui.keyCode.TAB) {
        e.preventDefault();
        args.grid.navigateNext();
      }
    };

    this.save = function() {
      args.commitChanges();
    };

    this.cancel = function() {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function() {
      $wrapper.hide();
    };

    this.show = function() {
      $wrapper.show();
    };

    this.position = function(position) {
      calculateEditorPosition(position, $wrapper);
      $wrapper
        .css('top', position.top)
        .css('left', position.left);
    };

    this.destroy = function() {
      $wrapper.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    this.loadValue = function(item) {
      var data = defaultValue = item[args.column.field];
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data = JSON.stringify(data, null, 4);
      } else if (Array.isArray(data)) {
        var temp = [];
        $.each(data, function(i, val) {
          if (typeof val === 'object') {
            temp.push(JSON.stringify(val, null, 4));
          } else {
            temp.push(val);
          }
        });
        data = '[' + temp.join() + ']';
      }
      $input.val(data);
      $input.trigger('select');
    };

    this.serializeValue = function() {
      if ($input.val() === '') {
        return null;
      }
      return $input.val();
    };

    this.applyValue = function(item, state) {
      setValue(args, item, state, 'text');
    };

    this.isValueChanged = function() {
      if ($input.val() == '' && _.isUndefined(defaultValue)) {
        return false;
      } else {
        return (!($input.val() == '' && _.isNull(defaultValue))) && ($input.val() != defaultValue);
      }
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  // Text data type editor
  function ReadOnlypgTextEditor(args) {
    var $input, $wrapper, $buttons;
    var defaultValue;
    var scope = this;

    this.init = function() {
      var $container = $('body');

      $wrapper = getWrapper().appendTo($container);
      $input = getTextArea().appendTo($wrapper);
      $buttons = getButtons(false).appendTo($wrapper);

      $buttons.find('button:first').on('click', this.cancel);
      $input.on('keydown', this.handleKeyDown);

      scope.position(args.position);
      $input.trigger('focus').trigger('select');
    };

    this.handleKeyDown = function(e) {
      if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
        scope.cancel();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
        scope.cancel();
        e.preventDefault();
        args.grid.navigatePrev();
      } else if (e.which == $.ui.keyCode.TAB) {
        scope.cancel();
        e.preventDefault();
        args.grid.navigateNext();
      }
    };

    this.cancel = function() {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function() {
      $wrapper.hide();
    };

    this.show = function() {
      $wrapper.show();
    };

    this.position = function(position) {
      calculateEditorPosition(position, $wrapper);
      $wrapper
        .css('top', position.top)
        .css('left', position.left);
    };

    this.destroy = function() {
      $wrapper.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    this.loadValue = function(item) {
      $input.val(defaultValue = item[args.column.field]);
      $input.trigger('select');
    };

    this.serializeValue = function() {
      return $input.val();
    };

    this.applyValue = function(item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function() {
      return (!($input.val() == '' && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  // JSON data type editor
  function ReadOnlyJsonTextEditor(args) {
    var $input, $wrapper, $buttons;
    var defaultValue;
    var scope = this;

    this.init = function() {
      var $container = $('body');

      $wrapper = getWrapper().appendTo($container);
      $input = getTextArea().appendTo($wrapper);
      $buttons = getButtons(false).appendTo($wrapper);

      $buttons.find('button:first').on('click', this.cancel);
      $input.on('keydown', this.handleKeyDown);

      scope.position(args.position);
      $input.trigger('focus').trigger('select');
    };

    this.handleKeyDown = function(e) {
      if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
        scope.cancel();
      } else if (e.which == $.ui.keyCode.ESCAPE) {
        e.preventDefault();
        scope.cancel();
      } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
        scope.cancel();
        e.preventDefault();
        args.grid.navigatePrev();
      } else if (e.which == $.ui.keyCode.TAB) {
        scope.cancel();
        e.preventDefault();
        args.grid.navigateNext();
      }
    };

    this.cancel = function() {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function() {
      $wrapper.hide();
    };

    this.show = function() {
      $wrapper.show();
    };

    this.position = function(position) {
      calculateEditorPosition(position, $wrapper);
      $wrapper
        .css('top', position.top)
        .css('left', position.left);
    };

    this.destroy = function() {
      $wrapper.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    this.loadValue = function(item) {
      var data = defaultValue = item[args.column.field];
      if (typeof data === 'object' && !Array.isArray(data)) {
        data = JSON.stringify(data, null, 4);
      } else if (Array.isArray(data)) {
        var temp = [];
        $.each(data, function(i, val) {
          if (typeof val === 'object') {
            temp.push(JSON.stringify(val, null, 4));
          } else {
            temp.push(val);
          }
        });
        data = '[' + temp.join() + ']';
      }
      $input.val(data);
      $input.trigger('select');
    };

    this.serializeValue = function() {
      return $input.val();
    };

    this.applyValue = function(item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function() {
      return (!($input.val() == '' && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  function ReadOnlyTextEditor(args) {
    var $input;
    var defaultValue;

    this.init = function() {
      $input = $('<INPUT type=text class=\'editor-text\' readonly/>')
        .appendTo(args.container)
        .on('keydown.nav', function(e) {
          if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
            e.stopImmediatePropagation();
          }
        })
        .trigger('focus')
        .trigger('select');
    };

    this.destroy = function() {
      $input.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    this.getValue = function() {
      return $input.val();
    };

    this.loadValue = function(item) {
      var value = item[args.column.field];

      // Check if value is null or undefined
      if (value === undefined && typeof value === 'undefined') {
        value = '';
      }
      defaultValue = value;
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      $input.trigger('select');
    };

    this.serializeValue = function() {
      return $input.val();
    };

    this.applyValue = function(item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function() {
      return (!($input.val() == '' && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  function ReadOnlyCheckboxEditor(args) {
    var $select;
    var defaultValue;

    this.init = function() {
      $select = $('<INPUT type=checkbox value=\'true\' class=\'editor-checkbox\' hideFocus disabled>');
      $select.appendTo(args.container);
      $select.trigger('focus');
    };

    this.destroy = function() {
      $select.remove();
    };

    this.focus = function() {
      $select.trigger('focus');
    };

    this.loadValue = function(item) {
      defaultValue = item[args.column.pos];
      if (_.isNull(defaultValue) || _.isUndefined(defaultValue)) {
        $select.prop('indeterminate', true);
        $select.data('checked', 2);
      } else {
        defaultValue = !!item[args.column.pos];
        if (defaultValue) {
          $select.prop('checked', true);
          $select.data('checked', 0);
        } else {
          $select.prop('checked', false);
          $select.data('checked', 1);
        }
      }
    };

    this.serializeValue = function() {
      if ($select.prop('indeterminate')) {
        return null;
      }
      return $select.prop('checked');
    };

    this.applyValue = function(item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function() {
      // var select_value = this.serializeValue();
      var select_value = $select.data('checked');
      return (!(select_value === 2 && (defaultValue == null || defaultValue == undefined))) &&
        (select_value !== defaultValue);
    };

    this.validate = function() {
      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  function CustomNumberEditor(args) {
    var $input;
    var defaultValue;

    this.init = function() {
      $input = $('<INPUT type=text class=\'editor-text\' />');

      $input.on('keydown.nav', function(e) {
        if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
          e.stopImmediatePropagation();
        }
      });

      $input.appendTo(args.container);
      $input.trigger('focus').trigger('select');
    };

    this.destroy = function() {
      $input.remove();
    };

    this.focus = function() {
      $input.trigger('focus');
    };

    this.loadValue = function(item) {
      defaultValue = item[args.column.field];

      if (args.column.is_array && !_.isNull(defaultValue) && !_.isUndefined(defaultValue)) {
        $input.val('{' + defaultValue.join() + '}');
      } else {
        $input.val(defaultValue);
      }

      $input[0].defaultValue = defaultValue;
      $input.trigger('select');
    };

    this.serializeValue = function() {
      var value = $input.val();

      if (value === '') {
        return null;
      }

      if (args.column.is_array) {
        // Remove leading { and trailing }.
        // Also remove leading and trailing whitespaces.
        var val = $.trim(value.slice(1, -1));

        if (val == '') {
          return [];
        }
        val = val.split(',');
        for (var k in val) {
          if (val[k] == '') {
            val[k] = null; //empty string from editor is null value.
          }
        }
        return val;
      }

      return value;
    };

    this.applyValue = function(item, state) {
      setValue(args, item, state, 'number');
    };

    this.isValueChanged = function() {
      if ($input.val() == '' && _.isUndefined(defaultValue)) {
        return false;
      } else if ($input.val() == '' && defaultValue == '') {
        return true;
      } else {
        return (!($input.val() == '' && _.isNull(defaultValue))) &&
          ($input.val() != defaultValue);
      }
    };

    this.validate = function() {
      var value = $input.val();
      if (!args.column.is_array && isNaN(value)) {
        return {
          valid: false,
          msg: 'Please enter a valid number',
        };
      }
      if (args.column.validator) {
        var validationResults = args.column.validator(value);
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      if (args.column.is_array) {
        if (!is_valid_array(value)) {
          return {
            valid: false,
            msg: 'Array must start with \'{\' and end with \'}\'',
          };
        }

        var val = $.trim(value.slice(1, -1)),
          arr;

        if (val == '') {
          arr = [];
        } else {
          arr = val.split(',');
        }

        for (var k in arr) {
          if (isNaN(arr[k])) {
            return {
              valid: false,
              msg: 'Please enter a valid numbers',
            };
          }
        }
      }

      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

  // Custom checkbox editor, We need it for runtime as it does not render
  // indeterminate checkbox state
  function pgCheckboxEditor(args) {
    var $select, el;
    var defaultValue, previousState;

    this.init = function() {
      $select = $('<div class=\'multi-checkbox\'><span class=\'check\' hideFocus></span></div>');
      $select.appendTo(args.container);
      $select.trigger('focus');

      // The following code is taken from https://css-tricks.com/indeterminate-checkboxes/
      $select.on('click', function() {
        el = $(this);
        var states = ['unchecked', 'partial', 'checked'];
        var curState = el.find('.check').data('state');
        curState++;
        el.find('.check')
          .removeClass('unchecked partial checked')
          .addClass(states[curState % states.length])
          .data('state', curState % states.length);
      });
    };

    this.destroy = function() {
      $select.remove();
    };

    this.focus = function() {
      $select.trigger('focus');
    };

    this.loadValue = function(item) {
      defaultValue = item[args.column.field];
      previousState = 1;
      if (_.isNull(defaultValue) || _.isUndefined(defaultValue)) {
        $select.find('.check').data('state', 1).addClass('partial');
      } else {
        defaultValue = !!item[args.column.field];
        if (defaultValue) {
          $select.find('.check').data('state', 2).addClass('checked');
          previousState = 2;
        } else {
          $select.find('.check').data('state', 0).addClass('unchecked');
          previousState = 0;
        }
      }
    };

    this.serializeValue = function() {
      if ($select.find('.check').data('state') == 1) {
        return null;
      }
      return $select.find('.check').data('state') == 2 ? true : false;
    };

    this.applyValue = function(item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function() {
      var currentState = $select.find('.check').data('state');
      return currentState !== previousState;
    };

    this.validate = function() {
      if (args.column.validator) {
        var validationResults = args.column.validator(this.serializeValue());
        if (!validationResults.valid) {
          return validationResults;
        }
      }
      return {
        valid: true,
        msg: null,
      };
    };

    this.init();
  }

})(window.jQuery);
