/*
  The public interface for the docking panel, it contains a layout that can be filled with custom
  elements and a number of convenience functions for use.
*/
function wcPanel(type, options) {
  this.$container = null;
  this._parent = null;
  this.$icon = null;

  if (options.icon) {
    this.icon(options.icon);
  }
  if (options.faicon) {
    this.faicon(options.faicon);
  }

  this._panelObject = null;
  this._initialized = false;

  this._type = type;
  this._title = type;
  this._titleVisible = true;

  this._layout = null;

  this._buttonList = [];

  this._actualPos = {
    x: 0.5,
    y: 0.5,
  };

  this._actualSize = {
    x: 0,
    y: 0,
  };

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._pos = {
    x: 0.5,
    y: 0.5,
  };

  this._moveData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._size = {
    x: -1,
    y: -1,
  };

  this._minSize = {
    x: 100,
    y: 100,
  };

  this._maxSize = {
    x: Infinity,
    y: Infinity,
  };

  this._scroll = {
    x: 0,
    y: 0,
  };

  this._scrollable = {
    x: true,
    y: true,
  };

  this._overflowVisible = false;
  this._moveable = true;
  this._closeable = true;
  this._resizeVisible = true;
  this._isVisible = false;

  this._events = {};

  this.__init();
};

wcPanel.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Finds the main Docker window.
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  // Gets, or Sets the title for this dock widget.
  title: function(title) {
    if (typeof title !== 'undefined') {
      if (title === false) {
        this._titleVisible = false;
      } else {
        this._title = title;
      }

      if (this._parent instanceof wcFrame) {
        this._parent.__updateTabs();
      }
    }

    return this._title;
  },

  // Retrieves the registration info of the panel.
  info: function() {
    return this.docker().panelTypeInfo(this._type);
  },

  // Retrieves the main widget container for this dock widget.
  layout: function() {
    return this._layout;
  },

  // Brings this widget into focus.
  // Params:
  //    flash     Optional, if true will flash the window.
  focus: function(flash) {
    var docker = this.docker();
    if (docker) {
      docker.__focus(this._parent, flash);
      for (var i = 0; i < this._parent._panelList.length; ++i) {
        if (this._parent._panelList[i] === this) {
          this._parent.panel(i);
          break;
        }
      }
    }
  },

  // Retrieves whether this panel is within view.
  isVisible: function() {
    return this._isVisible;
  },

  // Creates a new custom button that will appear in the title bar of the panel.
  // Params:
  //    name              The name of the button, to identify it.
  //    className         A class name to apply to the button.
  //    text              Text to apply to the button.
  //    tip               Tooltip text.
  //    isTogglable       If true, will make the button toggle on and off per click.
  //    toggleClassName   If this button is toggleable, you can designate an
  //                      optional class name that will replace the original class name.
  addButton: function(name, className, text, tip, isTogglable, toggleClassName) {
    this._buttonList.push({
      name: name,
      className: className,
      toggleClassName: toggleClassName,
      text: text,
      tip: tip,
      isTogglable: isTogglable,
      isToggled: false,
    });

    if (this._parent instanceof wcFrame) {
      this._parent.__update();
    }

    return this._buttonList.length-1;
  },

  // Removes a button from the panel.
  // Params:
  //    name        The name identifier for this button.
  removeButton: function(name) {
    for (var i = 0; i < this._buttonList.length; ++i) {
      if (this._buttonList[i].name === name) {
        this._buttonList.splice(i, 1);
        if (this._parent instanceof wcFrame) {
          this._parent.__onTabChange();
        }

        if (this._parent instanceof wcFrame) {
          this._parent.__update();
        }

        return true;
      }
    }
    return false;
  },

  // Gets, or Sets the current toggle state of a custom button that was
  // added using addButton().
  // Params:
  //    name          The name identifier of the button.
  //    isToggled     If supplied, will assign a new toggle state to the button.
  // Returns:
  //    Boolean       The current toggle state of the button.
  buttonState: function(name, isToggled) {
    for (var i = 0; i < this._buttonList.length; ++i) {
      if (this._buttonList[i].name === name) {
        if (typeof isToggled !== 'undefined') {
          this._buttonList[i].isToggled = isToggled;
          if (this._parent instanceof wcFrame) {
            this._parent.__onTabChange();
          }
        }

        if (this._parent instanceof wcFrame) {
          this._parent.__update();
        }

        return this._buttonList[i].isToggled;
      }
    }
    return false;
  },

  // Gets, or Sets the default position of the widget if it is floating.
  // Params:
  //    x, y    If supplied, sets the position of the floating panel.
  //            Can be a pixel position, or a string with a 'px' or '%' suffix.
  // Returns:
  //            An object with the current percentage position is returned.
  initPos: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._pos.x = this.__stringToPercent(x, docker.$container.width());
        this._pos.y = this.__stringToPercent(y, docker.$container.height());
      } else {
        this._pos.x = x;
        this._pos.y = y;
      }
    }

    return {x: this._pos.x, y: this._pos.y};
  },

  // Gets, or Sets the desired size of the widget.
  // Params:
  //    x, y    If supplied, sets the desired initial size of the panel.
  //            Can be a pixel position, or a string with a 'px' or '%' suffix.
  // Returns:
  //            An object with the current pixel size is returned.
  initSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._size.x = this.__stringToPixel(x, docker.$container.width());
        this._size.y = this.__stringToPixel(y, docker.$container.height());
      } else {
        this._size.x = x;
        this._size.y = y;
      }
    }
    return {x: this._size.x, y: this._size.y};
  },

  // Gets, or Sets the minimum size of the widget.
  // Params:
  //    x, y    If supplied, sets the desired minimum size of the panel.
  //            Can be a pixel position, or a string with a 'px' or '%' suffix.
  // Returns:
  //            An object with the current minimum pixel size is returned.
  minSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._minSize.x = this.__stringToPixel(x, docker.$container.width());
        this._minSize.y = this.__stringToPixel(y, docker.$container.height());
      } else {
        this._minSize.x = x;
        this._minSize.y = y;
      }
    }
    return this._minSize;
  },

  // Gets, or Sets the maximum size of the widget.
  // Params:
  //    x, y    If supplied, sets the desired maximum size of the panel.
  //            Can be a pixel position, or a string with a 'px' or '%' suffix.
  // Returns:
  //            An object with the current maximum pixel size is returned.
  maxSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._maxSize.x = this.__stringToPixel(x, docker.$container.width());
        this._maxSize.y = this.__stringToPixel(y, docker.$container.height());
      } else {
        this._maxSize.x = x;
        this._maxSize.y = y;
      }
    }
    return this._maxSize;
  },

  // Retrieves the width of the panel contents.
  width: function() {
    if (this.$container) {
      return this.$container.width();
    }
    return 0.0;
  },

  // Retrieves the height of the panel contents.
  height: function() {
    if (this.$container) {
      return this.$container.height();
    }
    return 0.0;
  },

  // Sets the icon for the panel, shown in the panels tab widget.
  // Must be a css class name that contains the image.
  icon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
    }

    this.$icon.removeClass();
    this.$icon.addClass('wcTabIcon ' + icon);
  },

  // Sets the icon for the panel, shown in the panels tab widget,
  // to an icon defined from the font-awesome library.
  faicon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
    }

    this.$icon.removeClass();
    this.$icon.addClass('fa fa-fw fa-' + icon);
  },

  // Gets, or Sets the scroll position of the window (if it is scrollable).
  // Params:
  //    x, y      If supplied, sets the scroll position of the window.
  //    duration  If setting a scroll position, you can supply a time duration
  //              to animate the scroll (in milliseconds).
  // Returns:
  //    object    The scroll position of the window.
  scroll: function(x, y, duration) {
    if (!this.$container) {
      return {x: 0, y: 0};
    }

    if (typeof x !== 'undefined') {
      if (duration) {
        this.$container.parent().stop().animate({
          scrollLeft: x,
          scrollTop: y,
        }, duration);
      } else {
        this.$container.parent().scrollLeft(x);
        this.$container.parent().scrollTop(y);
      }
    }

    return {
      x: this.$container.parent().scrollLeft(),
      y: this.$container.parent().scrollTop(),
    };
  },

  // Gets, or Sets whether overflow on this panel is visible.
  // Params:
  //    visible   If supplied, assigns whether overflow is visible.
  //
  // Returns:
  //    boolean   The current overflow visibility.
  overflowVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._overflowVisible = visible? true: false;
    }

    return this._overflowVisible;
  },

  // Gets, or Sets whether the contents of the panel are visible on resize.
  // Params:
  //    visible   If supplied, assigns whether panel contents are visible.
  //
  // Returns:
  //    boolean   The current resize visibility.
  resizeVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._resizeVisible = visible? true: false;
    }

    return this._resizeVisible;
  },

  // Gets, or Sets whether the window is scrollable.
  // Params:
  //    x, y      If supplied, assigns whether the window is scrollable
  //              for each axis.
  // Returns:
  //    object    The current scrollable status.
  scrollable: function(x, y) {
    if (typeof x !== 'undefined') {
      this._scrollable.x = x? true: false;
      this._scrollable.y = y? true: false;
    }

    return {x: this._scrollable.x, y: this._scrollable.y};
  },

  // Sets, or Gets the moveable status of the window.
  moveable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._moveable = enabled? true: false;
    }

    return this._moveable;
  },

  // Gets, or Sets whether this dock window can be closed.
  // Params:
  //    enabled     If supplied, toggles whether it can be closed.
  // Returns:
  //    bool        The current closeable status.
  closeable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._closeable = enabled? true: false;
      if (this._parent) {
        this._parent.__update();
      }
    }

    return this._closeable;
  },

  // Forces the window to close.
  close: function() {
    if (this._parent) {
      this._parent.$close.click();
    }
  },

  // Registers an event.
  // Params:
  //    eventType     The event type, as defined by wcDocker.EVENT_...
  //    handler       A handler function to be called for the event.
  //                  Params:
  //                    panel   The panel invoking the event.
  // Returns:
  //    true          The event was added.
  //    false         The event failed to add.
  on: function(eventType, handler) {
    if (!eventType) {
      return false;
    }

    if (!this._events[eventType]) {
      this._events[eventType] = [];
    }

    if (this._events[eventType].indexOf(handler) !== -1) {
      return false;
    }

    this._events[eventType].push(handler);
    return true;
  },

  // Unregisters an event.
  // Params:
  //    eventType     The event type to remove, if omitted, all events are removed.
  //    handler       The handler function to remove, if omitted, all events of
  //                  the above type are removed.
  off: function(eventType, handler) {
    if (typeof eventType === 'undefined') {
      this._events = {};
      return;
    } else {
      if (this._events[eventType]) {
        if (typeof handler === 'undefined') {
          this._events[eventType] = [];
        } else {
          for (var i = 0; i < this._events[eventType].length; ++i) {
            if (this._events[eventType][i] === handler) {
              this._events[eventType].splice(i, 1);
              break;
            }
          }
        }
      }
    }
  },

  // Triggers an event of a given type to all panels.
  // Params:
  //    eventType     The event to trigger.
  //    data          A custom data object to pass into all handlers.
  trigger: function(eventType, data) {
    var docker = this.docker();
    if (docker) {
      docker.trigger(eventType, data);
    }
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this._layout = new wcLayout(this.$container, this);
  },

  // Updates the size of the layout.
  __update: function() {
    this._layout.__update();
    if (!this.$container) {
      return;
    }

    if ( this._resizeVisible ) {
      this._parent.$frame.removeClass('wcHideOnResize');
    } else {
      this._parent.$frame.addClass('wcHideOnResize');
    }

    if (!this._initialized) {
      this._initialized = true;
      var self = this;
      setTimeout(function() {
        self.__trigger(wcDocker.EVENT_INIT);
      }, 0);
    }

    this.__trigger(wcDocker.EVENT_UPDATED);

    var width   = this.$container.width();
    var height  = this.$container.height();
    if (this._actualSize.x !== width || this._actualSize.y !== height) {
      this._actualSize.x = width;
      this._actualSize.y = height;

      this._resizeData.time = new Date();
      if (!this._resizeData.timeout) {
        this._resizeData.timeout = true;
        setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
        this.__trigger(wcDocker.EVENT_RESIZE_STARTED);
      }
      this.__trigger(wcDocker.EVENT_RESIZED);
    }

    var offset  = this.$container.offset();
    if (this._actualPos.x !== offset.left || this._actualPos.y !== offset.top) {
      this._actualPos.x = offset.left;
      this._actualPos.y = offset.top;

      this._moveData.time = new Date();
      if (!this._moveData.timeout) {
        this._moveData.timeout = true;
        setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
        this.__trigger(wcDocker.EVENT_MOVE_STARTED);
      }
      this.__trigger(wcDocker.EVENT_MOVED);
    }
  },

  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT_RESIZE_ENDED);
    }
  },

  __moveEnd: function() {
    if (new Date() - this._moveData.time < this._moveData.delta) {
      setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
    } else {
      this._moveData.timeout = false;
      this.__trigger(wcDocker.EVENT_MOVE_ENDED);
    }
  },

  __isVisible: function(inView) {
    if (this._isVisible !== inView) {
      this._isVisible = inView;

      this.__trigger(wcDocker.EVENT_VISIBILITY_CHANGED);
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type = 'wcPanel';
    data.panelType = this._type;
    data.title = this._title;
    // data.minSize = {
    //   x: this._minSize.x,
    //   y: this._minSize.y,
    // };
    // data.maxSize = {
    //   x: this._maxSize.x,
    //   y: this._maxSize.y,
    // };
    // data.scrollable = {
    //   x: this._scrollable.x,
    //   y: this._scrollable.y,
    // };
    // data.moveable = this._moveable;
    // data.closeable = this._closeable;
    // data.resizeVisible = this.resizeVisible();
    data.customData = {};
    this.__trigger(wcDocker.EVENT_SAVE_LAYOUT, data.customData);
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._title = data.title;
    // this._minSize.x = data.minSize.x;
    // this._minSize.y = data.minSize.y;
    // this._maxSize.x = data.maxSize.x;
    // this._maxSize.y = data.maxSize.y;
    // this._scrollable.x = data.scrollable.x;
    // this._scrollable.y = data.scrollable.y;
    // this._moveable = data.moveable;
    // this._closeable = data.closeable;
    // this.resizeVisible(data.resizeVisible)
    this.__trigger(wcDocker.EVENT_RESTORE_LAYOUT, data.customData);
  },

  // Triggers an event of a given type onto this current panel.
  // Params:
  //    eventType     The event to trigger.
  //    data          A custom data object to pass into all handlers.
  __trigger: function(eventType, data) {
    if (!eventType) {
      return false;
    }

    if (this._events[eventType]) {
      for (var i = 0; i < this._events[eventType].length; ++i) {
        this._events[eventType][i].call(this, data);
      }
    }
  },

  // Converts a potential string value to a percentage.
  __stringToPercent: function(value, size) {
    if (typeof value === 'string') {
      if (value.indexOf('%', value.length - 1) !== -1) {
        return parseFloat(value)/100;
      } else if (value.indexOf('px', value.length - 2) !== -1) {
        return parseFloat(value) / size;
      }
    }
    return parseFloat(value);
  },

  // Converts a potential string value to a pixel value.
  __stringToPixel: function(value, size) {
    if (typeof value === 'string') {
      if (value.indexOf('%', value.length - 1) !== -1) {
        return (parseFloat(value)/100) * size;
      } else if (value.indexOf('px', value.length - 2) !== -1) {
        return parseFloat(value);
      }
    }
    return parseFloat(value);
  },

  // Retrieves the bounding rect for this widget.
  __rect: function() {
    var offset = this.$container.offset();
    var width = this.$container.width();
    var height = this.$container.height();

    return {
      x: offset.left,
      y: offset.top,
      w: width,
      h: height,
    };
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
  //    parent              If supplied, sets a new parent for this layout.
  // Returns:
  //    JQuery collection   The current container.
  __container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this.$container = $container;
    
    if (this.$container) {
      this._layout.__container(this.$container);
    } else {
      this._layout.__container(null);
    }
    return this.$container;
  },

  // Destroys this panel.
  __destroy: function() {
    this._panelObject = null;
    this.off();

    this.__container(null);
    this._parent = null;
  },
};