/***
 * Contains JSON SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Editors": {
        "pgText": pgTextEditor,
        "JsonText": JsonTextEditor,
        // Below editor will read only editors, Just to display data
        "ReadOnlyText": ReadOnlyTextEditor,
        "ReadOnlyCheckbox": ReadOnlyCheckboxEditor,
        "Checkbox": CheckboxEditor, // Override editor to implement checkbox with three states
        "ReadOnlypgText": ReadOnlypgTextEditor,
        "ReadOnlyJsonText": ReadOnlyJsonTextEditor,
        "CustomNumber": CustomNumberEditor
      }
    }
  });

  // Text data type editor
  function pgTextEditor(args) {
    var $input, $wrapper;
    var defaultValue;
    var scope = this;

    this.init = function () {
      var $container = $("body");

      $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);

      $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0'>")
          .appendTo($wrapper);

      $("<DIV style='text-align:right'><BUTTON class='btn btn-primary fa fa-lg fa-save long_text_editor pg-alertify-button'>Save</BUTTON>"
         + "<BUTTON class='btn btn-danger fa fa-lg fa-times long_text_editor pg-alertify-button'>Cancel</BUTTON></DIV>")
          .appendTo($wrapper);

      $wrapper.find("button:first").bind("click", this.save);
      $wrapper.find("button:last").bind("click", this.cancel);
      $input.bind("keydown", this.handleKeyDown);

      scope.position(args.position);
      $input.focus().select();
    };

    this.handleKeyDown = function (e) {
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

    this.save = function () {
      args.commitChanges();
    };

    this.cancel = function () {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function () {
      $wrapper.hide();
    };

    this.show = function () {
      $wrapper.show();
    };

    this.position = function (position) {
      var _elem_height = $wrapper.parent().find('#datagrid').height(),
      is_hidden, _position;
      // We can not display editor partially visible so we will lift it above select column
      if(position.top > _elem_height) {
        is_hidden = position.bottom - _elem_height;
      }

      if(is_hidden) {
        _position = position.top - is_hidden;
      } else {
        _position = position.top - 5;
      }

      $wrapper
          .css("top", _position)
          .css("left", position.left - 5)
    };

    this.destroy = function () {
      $wrapper.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    // When text editor opens
    this.loadValue = function (item) {
      if (item[args.column.pos] === "") {
        $input.val("''");
      }
      else {
        $input.val(defaultValue = item[args.column.pos]);
        $input.select();
      }
    };

    this.serializeValue = function () {
      var value = $input.val();
      // If empty return null
      if (value === "") {
        return null;
      }
      // single/double quotes represent an empty string
      // If found return ''
      else if (value === "''" || value === '""') {
        return '';
      }
      else {
        // If found string literals - \"\", \'\', \\'\\' and \\\\'\\\\'
        // then remove slashes.
        value = value.replace("\\'\\'", "''");
        value = value.replace('\\"\\"', '""');
        value = value = value.replace(/\\\\/g, '\\');
        return value;
      }
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  // JSON data type editor
  function JsonTextEditor(args) {
    var $input, $wrapper;
    var defaultValue;
    var scope = this;

    this.init = function () {
      var $container = $("body");

      $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);

      $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0'>")
          .appendTo($wrapper);

      $("<DIV style='text-align:right'><BUTTON class='btn btn-primary fa fa-lg fa-save long_text_editor pg-alertify-button'>Save</BUTTON>"
         + "<BUTTON class='btn btn-danger fa fa-lg fa-times long_text_editor pg-alertify-button'>Cancel</BUTTON></DIV>")
          .appendTo($wrapper);

      $wrapper.find("button:first").bind("click", this.save);
      $wrapper.find("button:last").bind("click", this.cancel);
      $input.bind("keydown", this.handleKeyDown);

      scope.position(args.position);
      $input.focus().select();
    };

    this.handleKeyDown = function (e) {
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

    this.save = function () {
      args.commitChanges();
    };

    this.cancel = function () {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function () {
      $wrapper.hide();
    };

    this.show = function () {
      $wrapper.show();
    };

    this.position = function (position) {
      var _elem_height = $wrapper.parent().find('#datagrid').height(),
      is_hidden, _position;
      // We can not display editor partially visible so we will lift it above select column
      if(position.top > _elem_height) {
        is_hidden = position.bottom - _elem_height;
      }

      if(is_hidden) {
        _position = position.top - is_hidden;
      } else {
        _position = position.top - 5;
      }

      $wrapper
          .css("top", position.top - 5)
          .css("left", position.left - 5)
    };

    this.destroy = function () {
      $wrapper.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      var data = defaultValue = item[args.column.pos];
      if (typeof data === "object" && !Array.isArray(data)) {
        data = JSON.stringify(data);
      } else if (Array.isArray(data)) {
        var temp = [];
        $.each(data, function(i, val) {
          if (typeof val === "object") {
            temp.push(JSON.stringify(val));
          } else {
            temp.push(val)
          }
        });
        data = "[" + temp.join() + "]";
      }
      $input.val(data);
      $input.select();
    };

    this.serializeValue = function () {
      if ($input.val() === "") {
        return null;
      }
      return $input.val();
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  // Text data type editor
  function ReadOnlypgTextEditor(args) {
    var $input, $wrapper;
    var defaultValue;
    var scope = this;

    this.init = function () {
      var $container = $("body");

      $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);

      $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0' readonly>")
          .appendTo($wrapper);

      $("<DIV style='text-align:right'><BUTTON class='btn btn-primary fa fa-lg fa-times long_text_editor pg-alertify-button'>Close</BUTTON></DIV>")
       .appendTo($wrapper);

      $wrapper.find("button:first").bind("click", this.cancel);
      $input.bind("keydown", this.handleKeyDown);

      scope.position(args.position);
      $input.focus().select();
    };

    this.handleKeyDown = function (e) {
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

    this.cancel = function () {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function () {
      $wrapper.hide();
    };

    this.show = function () {
      $wrapper.show();
    };

    this.position = function (position) {
      var _elem_height = $wrapper.parent().find('#datagrid').height(),
        is_hidden, _position;
      // We can not display editor partially visible so we will lift it above select column
      if(position.top > _elem_height) {
        is_hidden = position.bottom - _elem_height;
      }

      if(is_hidden) {
        _position = position.top - is_hidden;
      } else {
        _position = position.top - 5;
      }

      $wrapper
          .css("top", _position)
          .css("left", position.left - 5)
    };

    this.destroy = function () {
      $wrapper.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      $input.val(defaultValue = item[args.column.pos]);
      $input.select();
    };

    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  /* Override CheckboxEditor to implement checkbox with three states.
   * 1) checked=true
   * 2) unchecked=false
   * 3) indeterminate=null/''
   */
  function CheckboxEditor(args) {
    var $select, el;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
      $select.appendTo(args.container);
      $select.focus();

      // The following code is taken from https://css-tricks.com/indeterminate-checkboxes/
      $select.data('checked', 0).bind("click", function (e) {
        el = $(this);
        switch(el.data('checked')) {
          // unchecked, going indeterminate
          case 0:
            el.data('checked', 1);
            el.prop('indeterminate', true);
            break;

          // indeterminate, going checked
          case 1:
            el.data('checked', 2);
            el.prop('indeterminate', false);
            el.prop('checked', true);
            break;

          // checked, going unchecked
          default:
            el.data('checked', 0);
            el.prop('indeterminate', false);
            el.prop('checked', false);
        }
      });
    };

    this.destroy = function () {
      $select.remove();
    };

    this.focus = function () {
      $select.focus();
    };

    this.loadValue = function (item) {
      defaultValue = item[args.column.pos];
      if (_.isNull(defaultValue)||_.isUndefined(defaultValue)) {
        $select.prop('indeterminate', true);
      }
      else {
        defaultValue = !!item[args.column.pos];
        if (defaultValue) {
          $select.prop('checked', true);
        } else {
          $select.prop('checked', false);
        }
      }
    };

    this.serializeValue = function () {
      if ($select.prop('indeterminate')) {
        return null;
      }
      return $select.prop('checked');
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (this.serializeValue() !== defaultValue);
    };

    this.validate = function () {
      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  // JSON data type editor
  function ReadOnlyJsonTextEditor(args) {
    var $input, $wrapper;
    var defaultValue;
    var scope = this;

    this.init = function () {
      var $container = $("body");

      $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);

      $input = $("<TEXTAREA hidefocus rows=5 style='backround:white;width:250px;height:80px;border:0;outline:0' readonly>")
          .appendTo($wrapper);

      $("<DIV style='text-align:right'><BUTTON class='btn btn-primary fa fa-lg fa-times long_text_editor pg-alertify-button'>Close</BUTTON></DIV>")
       .appendTo($wrapper);

      $wrapper.find("button:first").bind("click", this.cancel);
      $input.bind("keydown", this.handleKeyDown);

      scope.position(args.position);
      $input.focus().select();
    };

    this.handleKeyDown = function (e) {
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

    this.cancel = function () {
      $input.val(defaultValue);
      args.cancelChanges();
    };

    this.hide = function () {
      $wrapper.hide();
    };

    this.show = function () {
      $wrapper.show();
    };

    this.position = function (position) {
      var _elem_height = $wrapper.parent().find('#datagrid').height(),
        is_hidden, _position;
      // We can not display editor partially visible so we will lift it above select column
      if(position.top > _elem_height) {
        is_hidden = position.bottom - _elem_height;
      }

      if(is_hidden) {
        _position = position.top - is_hidden;
      } else {
        _position = position.top - 5;
      }

      $wrapper
          .css("top", _position)
          .css("left", position.left - 5)
    };

    this.destroy = function () {
      $wrapper.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      var data = defaultValue = item[args.column.pos];
      if (typeof data === "object" && !Array.isArray(data)) {
        data = JSON.stringify(data);
      } else if (Array.isArray(data)) {
        var temp = [];
        $.each(data, function(i, val) {
          if (typeof val === "object") {
            temp.push(JSON.stringify(val));
          } else {
            temp.push(val)
          }
        });
        data = "[" + temp.join() + "]";
      }
      $input.val(data);
      $input.select();
    };

    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  function ReadOnlyTextEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $input = $("<INPUT type=text class='editor-text' readonly/>")
          .appendTo(args.container)
          .bind("keydown.nav", function (e) {
            if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
              e.stopImmediatePropagation();
            }
          })
          .focus()
          .select();
    };

    this.destroy = function () {
      $input.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.getValue = function () {
      return $input.val();
    };

    this.loadValue = function (item) {
      var value = item[args.column.pos];

      // Check if value is null or undefined
      if (value === undefined && typeof value === "undefined") {
        value = ""
      }
      defaultValue = value;
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      $input.select();
    };

    this.serializeValue = function () {
      return $input.val();
    };

    this.applyValue = function (item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  function ReadOnlyCheckboxEditor(args) {
    var $select, el;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus disabled>");
      $select.appendTo(args.container);
      $select.focus();

      // The following code is taken from https://css-tricks.com/indeterminate-checkboxes/
      $select.data('checked', 0).bind("click", function (e) {
        el = $(this);
        switch(el.data('checked')) {
          // unchecked, going indeterminate
          case 0:
            el.data('checked', 1);
            el.prop('indeterminate', true);
            break;

          // indeterminate, going checked
          case 1:
            el.data('checked', 2);
            el.prop('indeterminate', false);
            el.prop('checked', true);
            break;

          // checked, going unchecked
          default:
            el.data('checked', 0);
            el.prop('indeterminate', false);
            el.prop('checked', false);
        }
      });
    };

    this.destroy = function () {
      $select.remove();
    };

    this.focus = function () {
      $select.focus();
    };

    this.loadValue = function (item) {
      defaultValue = item[args.column.field];
      if (_.isNull(defaultValue)||_.isUndefined(defaultValue)) {
        $select.prop('indeterminate', true);
      }
      else {
        defaultValue = !!item[args.column.field];
        if (defaultValue) {
          $select.prop('checked', true);
        } else {
          $select.prop('checked', false);
        }
      }
    };

    this.serializeValue = function () {
      if ($select.prop('indeterminate')) {
        return null;
      }
      return $select.prop('checked');
    };

    this.applyValue = function (item, state) {
      item[args.column.field] = state;
    };

    this.isValueChanged = function () {
      return (this.serializeValue() !== defaultValue);
    };

    this.validate = function () {
      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

  function CustomNumberEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;

    this.init = function () {
      $input = $("<INPUT type=text class='editor-text' />");

      $input.bind("keydown.nav", function (e) {
        if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
          e.stopImmediatePropagation();
        }
      });

      $input.appendTo(args.container);
      $input.focus().select();
    };

    this.destroy = function () {
      $input.remove();
    };

    this.focus = function () {
      $input.focus();
    };

    this.loadValue = function (item) {
      defaultValue = item[args.column.pos];
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      $input.select();
    };

    this.serializeValue = function () {
      if ($input.val() === "") {
        return null;
      }
      return $input.val();
    };

    this.applyValue = function (item, state) {
      item[args.column.pos] = state;
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (isNaN($input.val())) {
        return {
          valid: false,
          msg: "Please enter a valid integer"
        };
      }

      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init();
  }

})(jQuery);
