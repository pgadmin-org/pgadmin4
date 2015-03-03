/*!
 * Web Cabin Docker - Docking Layout Interface.
 *
 * Dependancies:
 *  JQuery 1.11.1
 *  JQuery-contextMenu 1.6.6
 *  font-awesome 4.2.0
 *
 * Author: Jeff Houde (Lochemage@gmail.com)
 * Web: http://docker.webcabin.org/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */

// Provide backward compatibility for IE8 and other such older browsers.
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

/*
  The main window instance.  This manages all of the docking panels and user input.
  There should only be one instance of this, although it is not enforced.

  options allows overriding default options for docker. The current fields are:
    allowContextMenu: boolean (default true) - Create the right click menu for adding/removing panels.
    hideOnResize: boolean (default false) - If true, panels will hide their content as they are being resized.
*/
function wcDocker(container, options) {
  this.$container = $(container).addClass('wcDocker');
  this.$transition = $('<div class="wcDockerTransition"></div>');
  this.$container.append(this.$transition);

  this._events = {};

  this._root = null;
  this._frameList = [];
  this._floatingList = [];
  this._modalList = [];
  this._focusFrame = null;

  this._splitterList = [];
  this._tabList = [];

  this._dockPanelTypeList = [];

  this._draggingSplitter = null;
  this._draggingFrame = null;
  this._draggingFrameSizer = null;
  this._draggingFrameTab = null;
  this._draggingCustomTabFrame = null;
  this._ghost = null;
  this._menuTimer = 0;

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._defaultOptions = {
    allowContextMenu: true
  };

  this._options = {};
  for( var prop in this._defaultOptions ) {
    this._options[prop] = this._defaultOptions[prop];
  }
  for( var prop in options ) {
    this._options[prop] = options[prop];
  }

  this.__init();
};

// Docking positions.
wcDocker.DOCK_MODAL                 = 'modal';
wcDocker.DOCK_FLOAT                 = 'float';
wcDocker.DOCK_TOP                   = 'top';
wcDocker.DOCK_LEFT                  = 'left';
wcDocker.DOCK_RIGHT                 = 'right';
wcDocker.DOCK_BOTTOM                = 'bottom';
wcDocker.DOCK_STACKED               = 'stacked';

// Internal events.
wcDocker.EVENT_INIT                 = 'panelInit';
wcDocker.EVENT_UPDATED              = 'panelUpdated';
wcDocker.EVENT_VISIBILITY_CHANGED   = 'panelVisibilityChanged';
wcDocker.EVENT_BEGIN_DOCK           = 'panelBeginDock';
wcDocker.EVENT_END_DOCK             = 'panelEndDock';
wcDocker.EVENT_GAIN_FOCUS           = 'panelGainFocus';
wcDocker.EVENT_LOST_FOCUS           = 'panelLostFocus';
wcDocker.EVENT_CLOSED               = 'panelClosed';
wcDocker.EVENT_BUTTON               = 'panelButton';
wcDocker.EVENT_ATTACHED             = 'panelAttached';
wcDocker.EVENT_DETACHED             = 'panelDetached';
wcDocker.EVENT_MOVE_STARTED         = 'panelMoveStarted';
wcDocker.EVENT_MOVE_ENDED           = 'panelMoveEnded';
wcDocker.EVENT_MOVED                = 'panelMoved';
wcDocker.EVENT_RESIZE_STARTED       = 'panelResizeStarted';
wcDocker.EVENT_RESIZE_ENDED         = 'panelResizeEnded';
wcDocker.EVENT_RESIZED              = 'panelResized';
wcDocker.EVENT_SCROLLED             = 'panelScrolled';
wcDocker.EVENT_SAVE_LAYOUT          = 'layoutSave';
wcDocker.EVENT_RESTORE_LAYOUT       = 'layoutRestore';
wcDocker.EVENT_CUSTOM_TAB_CHANGED   = 'customTabChanged';
wcDocker.EVENT_CUSTOM_TAB_CLOSED    = 'customTabClosed';

// Used for the splitter bar orientation.
wcDocker.ORIENTATION_VERTICAL       = false;
wcDocker.ORIENTATION_HORIZONTAL     = true;

wcDocker.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Registers a new docking panel type to be used later.
  // Params:
  //    name          The name for this new type.
  //    options       An optional object that defines various options
  //                  to initialize the panel with.
  //    createFunc    The function that populates the contents of
  //                  a newly created dock panel of this type.
  //                  Params:
  //                    panel      The dock panel to populate.
  //    isPrivate     If true, this type will not appear to the user
  //                  as a window type to create.
  // Returns:
  //    true        The new type has been added successfully.
  //    false       Failure, the type name already exists.
  registerPanelType: function(name, optionsOrCreateFunc, isPrivate) {

    var options = optionsOrCreateFunc;
    if (typeof options === 'function') {
      options = {
        onCreate: optionsOrCreateFunc,
      };
    }

    if (typeof isPrivate != 'undefined') {
      options.isPrivate = isPrivate;
    }

    if ($.isEmptyObject(options)) {
      options = null;
    }

    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === name) {
        return false;
      }
    }

    this._dockPanelTypeList.push({
      name: name,
      options: options,
    });

    var $menu = $('menu').find('menu');
    $menu.append($('<menuitem label="' + name + '">'));
    return true;
  },

  // Retrieves a list of all currently registered panel types.
  // Params:
  //    includePrivate    If true, panels registered as private will
  //                      also be included with this list.
  //
  // Returns:
  //    String[]          A list of panel type names.
  panelTypes: function(includePrivate) {
    var result = [];
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (includePrivate || !this._dockPanelTypeList[i].options.isPrivate) {
        result.push(this._dockPanelTypeList[i].name);
      }
    }
    return result;
  },

  // Retrieves the options data associated with a given panel type when it was registered.
  // Params:
  //    typeName      The type of the panel.
  //
  // Returns:
  //    Object        An object that represents the registered info of the panel type.
  //    false         The panel type requested was not found.
  panelTypeInfo: function(typeName) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name == typeName) {
        return this._dockPanelTypeList[i].options;
      }
    }
    return false;
  },

  // Add a new dock panel to the window of a given type.
  // Params:
  //    typeName      The type of panel to create.
  //    location      The docking location of the new panel,
  //                  as defined by wcDocker.DOCK_ values.
  //    targetPanel   An optional target panel, providing one will cause
  //                  the docking location to be relative to this panel.
  //                  Must be supplied when using wcDocker.DOCK_STACKED.
  //    rect          An object with an x, y position, and a w, h size
  //                  used to influence the starting position and size
  //                  of a floating or modal panel.
  //                  
  // Returns:
  //    wcPanel       The panel that was created.
  //    false         The panel type does not exist.
  addPanel: function(typeName, location, targetPanel, rect) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === typeName) {
        var panelType = this._dockPanelTypeList[i];
        var panel = new wcPanel(typeName, panelType.options);
        panel._parent = this;
        panel.__container(this.$transition);
        var options = (panelType.options && panelType.options.options) || {};
        panel._panelObject = new panelType.options.onCreate(panel, options);

        if (location === wcDocker.DOCK_STACKED) {
          this.__addPanelGrouped(panel, location, targetPanel);
        } else {
          this.__addPanelAlone(panel, location, targetPanel, rect);
        }

        this.__update();
        return panel;
      }
    }
    return false;
  },

  // Removes a dock panel from the window.
  // Params:
  //    panel        The panel to remove.
  // Returns:
  //    true          The panel was removed.
  //    false         There was a problem.
  removePanel: function(panel) {
    if (!panel) {
      return false;
    }

    // Do not remove if this is the last moveable panel.
    if (this.__isLastPanel(panel)) {
      return false;
    }

    var parentFrame = panel._parent;
    if (parentFrame instanceof wcFrame) {
      panel.__trigger(wcDocker.EVENT_CLOSED);

      // If no more panels remain in this frame, remove the frame.
      if (!parentFrame.removePanel(panel)) {
        var index = this._floatingList.indexOf(parentFrame);
        if (index !== -1) {
          this._floatingList.splice(index, 1);
        }
        index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }
        index = this._modalList.indexOf(parentFrame);
        if (index !== -1) {
          this._modalList.splice(index, 1);
        }

        if (this._modalList.length) {
          this.__focus(this._modalList[this._modalList.length-1]);
        } else if (this._floatingList.length) {
          this.__focus(this._floatingList[this._floatingList.length-1]);
        }

        var parentSplitter = parentFrame._parent;
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.__removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the panel in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          other.__container(this.$transition);
          other._parent = null;

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          var parent = parentSplitter._parent;
          parentContainer = parentSplitter.__container();
          parentSplitter.__destroy();

          if (parent instanceof wcSplitter) {
            parent.__removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other._parent = this;
            other.__container(parentContainer);
          }
          this.__update();
        } else if (parentFrame === this._root) {
          this._root = null;
        }

        if (this._focusFrame === parentFrame) {
          this._focusFrame = null;
        }
        parentFrame.__destroy();
      }
      panel.__destroy();
      return true;
    }
    return false;
  },

  // Moves a docking panel from its current location to another.
  // Params:
  //    panel         The panel to move.
  //    location      The docking location of the new panel,
  //                  as defined by wcDocker.DOCK_ values.
  //    targetPanel   An optional target panel, providing one will cause
  //                  the docking location to be relative to this panel.
  //                  Must be supplied when using wcDocker.DOCK_STACKED.
  //    rect          An object with an x, y position, and a w, h size
  //                  used to influence the starting position and size
  //                  of a floating or modal panel.
  // Returns:
  //    wcPanel       The panel that was created.
  //    false         The panel type does not exist.
  movePanel: function(panel, location, targetPanel, rect) {
    if (this.__isLastPanel(panel)) {
      return panel;
    }

    var $elem = panel.$container;
    if (panel._parent instanceof wcFrame) {
      $elem = panel._parent.$frame;
    }
    var offset = $elem.offset();
    var width  = $elem.width();
    var height = $elem.height();

    var parentFrame = panel._parent;
    var floating = false;
    if (parentFrame instanceof wcFrame) {
      floating = parentFrame._isFloating;
    }

    if (parentFrame instanceof wcFrame) {
      // Remove the panel from the frame.
      for (var i = 0; i < parentFrame._panelList.length; ++i) {
        if (parentFrame._panelList[i] === panel) {
          if (parentFrame._curTab >= i) {
            parentFrame._curTab--;
          }

          // Keep the panel in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          panel.__container(this.$transition);
          panel._parent = null;

          parentFrame._panelList.splice(i, 1);
          break;
        }
      }

      if (parentFrame._curTab === -1 && parentFrame._panelList.length) {
        parentFrame._curTab = 0;
      }

      parentFrame.__updateTabs();
      
      // If no more panels remain in this frame, remove the frame.
      if (parentFrame._panelList.length === 0) {
        var index = this._floatingList.indexOf(parentFrame);
        if (index !== -1) {
          this._floatingList.splice(index, 1);
        }
        index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }

        var parentSplitter = parentFrame._parent;
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.__removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the item in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          other.__container(this.$transition);
          other._parent = null;

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          var parent = parentSplitter._parent;
          parentContainer = parentSplitter.__container();
          parentSplitter.__destroy();

          if (parent instanceof wcSplitter) {
            parent.__removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other._parent = this;
            other.__container(parentContainer);
          }
          this.__update();
        }

        if (this._focusFrame === parentFrame) {
          this._focusFrame = null;
        }

        parentFrame.__destroy();
      }
    }

    panel.initSize(width, height);
    if (location === wcDocker.DOCK_STACKED) {
      this.__addPanelGrouped(panel, location, targetPanel);
    } else {
      this.__addPanelAlone(panel, location, targetPanel, rect);
    }

    var frame = panel._parent;
    if (frame instanceof wcFrame) {
      if (frame._panelList.length === 1) {
        frame.pos(offset.left + width/2 + 20, offset.top + height/2 + 20, true);
      }
    }

    this.__update();

    if (frame instanceof wcFrame) {
      if (floating !== frame._isFloating) {
        if (frame._isFloating) {
          panel.__trigger(wcDocker.EVENT_DETACHED);
        } else {
          panel.__trigger(wcDocker.EVENT_ATTACHED);
        }
      }
    }

    panel.__trigger(wcDocker.EVENT_MOVED);
    return panel;
  },

  // Finds all instances of a given panel type.
  // Params:
  //    typeName    The type of panel.
  // Returns:
  //    [wcPanel]   A list of all panels of the given type.
  findPanels: function(typeName) {
    var result = [];
    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        if (!typeName || panel._type === typeName) {
          result.push(panel);
        }
      }
    }

    return result;
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

  // Trigger an event on all panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  trigger: function(eventName, data) {
    if (!eventName) {
      return false;
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        panel.__trigger(eventName, data);
      }
    }

    this.__trigger(eventName, data);
  },

  // Assigns a basic context menu to a selector element.  The context
  // Menu is a simple list of options, no nesting or special options.
  //
  // If you wish to use a more complex context menu, you can use
  // $.contextMenu directly, see
  // http://medialize.github.io/jQuery-contextMenu/docs.html
  // for more information.
  // Params:
  //    selector              A JQuery selector string that designates the
  //                          elements who use this menu.
  //    itemListOrBuildFunc   An array with each context menu item in it, each item
  //                          is an object {name:string, callback:function(key, opts, panel)}.
  //                          This can also be a function that dynamically builds and
  //                          returns the item list, parameters given are the $trigger object
  //                          of the menu and the menu event object.
  //    includeDefault        If true, all default panel menu options will also be shown.
  basicMenu: function(selector, itemListOrBuildFunc, includeDefault) {
    var self = this;
    $.contextMenu({
      selector: selector,
      build: function($trigger, event) {
        var myFrame;
        for (var i = 0; i < self._frameList.length; ++i) {
          var $frame = $trigger.hasClass('wcFrame') && $trigger || $trigger.parents('.wcFrame');
          if (self._frameList[i].$frame[0] === $frame[0]) {
            myFrame = self._frameList[i];
            break;
          }
        }

        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        var isTitle = false;
        if (mouse.y - myFrame.$frame.offset().top <= 20) {
          isTitle = true;
        }

        var windowTypes = {};
        for (var i = 0; i < self._dockPanelTypeList.length; ++i) {
          var type = self._dockPanelTypeList[i];
          if (!type.options.isPrivate) {
            if (type.options.limit > 0) {
              if (self.findPanels(type.name).length >= type.options.limit) {
                continue;
              }
            }
            var icon = null;
            var faicon = null;
            var label = type.name;
            if (type.options) {
              if (type.options.faicon) {
                faicon = type.options.faicon;
              }
              if (type.options.icon) {
                icon = type.options.icon;
              }
              if (type.options.title) {
                label = type.options.title;
              }
            }
            windowTypes[type.name] = {
              name: label,
              icon: icon,
              faicon: faicon,
              className: 'wcMenuCreatePanel',
            };
          }
        }

        var separatorIndex = 0;
        var finalItems = {};
        var itemList = itemListOrBuildFunc;
        if (typeof itemListOrBuildFunc === 'function') {
          itemList = itemListOrBuildFunc($trigger, event);
        }

        for (var i = 0; i < itemList.length; ++i) {
          if ($.isEmptyObject(itemList[i])) {
            finalItems['sep' + separatorIndex++] = "---------";
            continue;
          }

          var callback = itemList[i].callback;
          if (callback) {
            (function(listItem, callback) {
              listItem.callback = function(key, opts) {
                var panel = null;
                var $frame = opts.$trigger.parents('.wcFrame').first();
                if ($frame.length) {
                  for (var a = 0; a < self._frameList.length; ++a) {
                    if ($frame[0] === self._frameList[a].$frame[0]) {
                      panel = self._frameList[a].panel();
                    }
                  }
                }

                callback(key, opts, panel);
              };
            })(itemList[i], callback);
          }
          finalItems[itemList[i].name] = itemList[i];
        }

        var items = finalItems;

        if (includeDefault) {
          if (!$.isEmptyObject(finalItems)) {
            items['sep' + separatorIndex++] = "---------";
          }

          if (isTitle) {
            items['Close Panel'] = {
              name: 'Close Tab',
              faicon: 'close',
              disabled: !myFrame.panel().closeable() || self.__isLastPanel(myFrame.panel()),
            };
            if (!myFrame._isFloating) {
              items['Detach Panel'] = {
                name: 'Detach Tab',
                faicon: 'level-down',
                disabled: !myFrame.panel().moveable() || self.__isLastPanel(myFrame.panel()),
              };
            }

            items['sep' + separatorIndex++] = "---------";
    
            items.fold1 = {
              name: 'Add Tab',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(myFrame.panel()._titleVisible && (!myFrame._isFloating || self._modalList.indexOf(myFrame) === -1)),
              className: 'wcMenuCreatePanel',
            };
            items['sep' + separatorIndex++] = "---------";

            items['Flash Panel'] = {
              name: 'Flash Panel',
              faicon: 'lightbulb-o',
            };
          } else {
            items['Close Panel'] = {
              name: 'Close Panel',
              faicon: 'close',
              disabled: !myFrame.panel().closeable() || self.__isLastPanel(myFrame.panel()),
            };
            if (!myFrame._isFloating) {
              items['Detach Panel'] = {
                name: 'Detach Panel',
                faicon: 'level-down',
                disabled: !myFrame.panel().moveable() || self.__isLastPanel(myFrame.panel()),
              };
            }

            items['sep' + separatorIndex++] = "---------";

            items.fold1 = {
              name: 'Insert Panel',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(!myFrame._isFloating && myFrame.panel().moveable()),
              className: 'wcMenuCreatePanel',
            };
            items['sep' + separatorIndex++] = "---------";

            items['Flash Panel'] = {
              name: 'Flash Panel',
              faicon: 'lightbulb-o',
            };
          }

          if (!myFrame._isFloating && myFrame.panel().moveable()) {
            var rect = myFrame.__rect();
            self._ghost = new wcGhost(rect, mouse, self);
            myFrame.__checkAnchorDrop(mouse, false, self._ghost, true);
            self._ghost.$ghost.hide();
          }
        }

        return {
          callback: function(key, options) {
            if (key === 'Close Panel') {
              setTimeout(function() {
                myFrame.panel().close();
              }, 10);
            } else if (key === 'Detach Panel') {
              self.movePanel(myFrame.panel(), wcDocker.DOCK_FLOAT, false);
            } else if (key === 'Flash Panel') {
              self.__focus(myFrame, true);
            } else {
              if (myFrame && self._ghost) {
                var anchor = self._ghost.anchor();
                var newPanel = self.addPanel(key, anchor.loc, myFrame.panel(), self._ghost.rect());
                newPanel.focus();
              }
            }
          },
          events: {
            show: function(opt) {
              (function(items){

                // Whenever them menu is shown, we update and add the faicons.
                // Grab all those menu items, and propogate a list with them.
                var menuItems = {};
                var options = opt.$menu.find('.context-menu-item');
                for (var i = 0; i < options.length; ++i) {
                  var $option = $(options[i]);
                  var $span = $option.find('span');
                  if ($span.length) {
                    menuItems[$span[0].innerHTML] = $option;
                  }
                }

                // function calls itself so that we get nice icons inside of menus as well.
                (function recursiveIconAdd(items) {
                  for(var it in items) {
                    var item = items[it];
                    var $menu = menuItems[item.name];

                    if ($menu) {
                      var $icon = $('<div class="wcMenuIcon">');
                      $menu.prepend($icon);

                      if (item.icon) {
                        $icon.addClass(item.icon);
                      }

                      if (item.faicon) {
                        $icon.addClass('fa fa-menu fa-' + item.faicon + ' fa-lg fa-fw');
                      }

                      // Custom submenu arrow.
                      if ($menu.hasClass('context-menu-submenu')) {
                        var $expander = $('<div class="wcMenuSubMenu fa fa-caret-right fa-lg">');
                        $menu.append($expander);
                      }
                    }

                    // Iterate through sub-menus.
                    if (item.items) {
                      recursiveIconAdd(item.items);
                    }
                  }
                })(items);

              })(items);
            },
            hide: function(opt) {
              if (self._ghost) {
                self._ghost.__destroy();
                self._ghost = false;
              }
            },
          },
          animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
          reposition: false,
          autoHide: true,
          zIndex: 200,
          items: items,
        };
      },
    });
  },

  // Bypasses the next context menu event.
  // Use this during a mouse up event in which you do not want the
  // context menu to appear.
  bypassMenu: function() {
    if (this._menuTimer) {
      clearTimeout(this._menuTimer);
    }

    for (var i in $.contextMenu.menus) {
      var menuSelector = $.contextMenu.menus[i].selector;
      $(menuSelector).contextMenu(false);
    }

    var self = this;
    this._menuTimer = setTimeout(function() {
      for (var i in $.contextMenu.menus) {
        var menuSelector = $.contextMenu.menus[i].selector;
        $(menuSelector).contextMenu(true);
      }
      self._menuTimer = null;
    }, 0);
  },

  // Saves the current panel configuration into a meta
  // string that can be used later to restore it.
  save: function() {
    var data = {};

    data.floating = [];
    for (var i = 0; i < this._floatingList.length; ++i) {
      data.floating.push(this._floatingList[i].__save());
    }

    data.root = this._root.__save();
    
    return JSON.stringify(data, function(key, value) {
      if (value == Infinity) {
        return "Infinity";
      }
      return value;
    });
  },

  // Restores a previously saved configuration.
  restore: function(dataString) {
    var data = JSON.parse(dataString, function(key, value) {
      if (value === 'Infinity') {
        return Infinity;
      }
      return value;
    });

    this.clear();

    this._root = this.__create(data.root, this, this.$container);
    this._root.__restore(data.root, this);

    for (var i = 0; i < data.floating.length; ++i) {
      var panel = this.__create(data.floating[i], this, this.$container);
      panel.__restore(data.floating[i], this);
    }

    this.__update();
  },

  // Clears out all panels.
  clear: function() {
    this._root = null;

    for (var i = 0; i < this._splitterList.length; ++i) {
      this._splitterList[i].__destroy();
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      this._frameList[i].__destroy();
    }

    while (this._frameList.length) this._frameList.pop();
    while (this._floatingList.length) this._floatingList.pop();
    while (this._splitterList.length) this._splitterList.pop();
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  __init: function() {
    this._root = null;

    var self = this;
    $(window).resize(self.__resize.bind(self));
    
    // Setup our context menus.
    if ( this._options.allowContextMenu ) {
      this.basicMenu('.wcFrame', [], true);
    }

    var contextTimer;
    $('body').on('contextmenu', 'a, img', function() {
      if (contextTimer) {
        clearTimeout(contextTimer);
      }

      $(".wcFrame").contextMenu(false);
      contextTimer = setTimeout(function() {
        $(".wcFrame").contextMenu(true);
        contextTimer = null;
      }, 100);
      return true;
    });

    $('body').on('contextmenu', '.wcSplitterBar', function() {
      return false;
    });
    
    // Hovering over a panel creation context menu.
    $('body').on('mouseenter', '.wcMenuCreatePanel', function() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeIn(200);
      }
    });

    $('body').on('mouseleave', '.wcMenuCreatePanel', function() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeOut(200);
      }
    });

    $('body').on('mousedown', '.wcModalBlocker', function(event) {
      // for (var i = 0; i < self._modalList.length; ++i) {
      //   self._modalList[i].__focus(true);
      // }
      if (self._modalList.length) {
        self._modalList[self._modalList.length-1].__focus(true);
      }
    });

    // On some browsers, clicking and dragging a tab will drag it's graphic around.
    // Here I am disabling this as it interferes with my own drag-drop.
    $('body').on('mousedown', '.wcPanelTab', function(event) {
      event.preventDefault();
      event.returnValue = false;
    });

    $('body').on('selectstart', '.wcFrameTitle, .wcPanelTab, .wcFrameButton', function(event) {
      event.preventDefault();
    });

    // Close button on frames should destroy those panels.
    $('body').on('mousedown', '.wcFrame > .wcFrameButton', function() {
      self.$container.addClass('wcDisableSelection');
    });

    // Clicking on a panel frame button.
    $('body').on('click', '.wcFrame > .wcFrameButton', function() {
      self.$container.removeClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$close[0] === this) {
          var panel = frame.panel();
          self.removePanel(panel);
          self.__update();
          return;
        }
        if (frame.$tabLeft[0] === this) {
          frame._tabScrollPos-=frame.$title.width()/2;
          if (frame._tabScrollPos < 0) {
            frame._tabScrollPos = 0;
          }
          frame.__updateTabs();
          return;
        }
        if (frame.$tabRight[0] === this) {
          frame._tabScrollPos+=frame.$title.width()/2;
          frame.__updateTabs();
          return;
        }

        for (var a = 0; a < frame._buttonList.length; ++a) {
          if (frame._buttonList[a][0] === this) {
            var $button = frame._buttonList[a];
            var result = {
              name: $button.data('name'),
              isToggled: false,
            }

            if ($button.hasClass('wcFrameButtonToggler')) {
              $button.toggleClass('wcFrameButtonToggled');
              if ($button.hasClass('wcFrameButtonToggled')) {
                result.isToggled = true;
              }
            }

            var panel = frame.panel();
            panel.buttonState(result.name, result.isToggled);
            panel.__trigger(wcDocker.EVENT_BUTTON, result);
            return;
          }
        }
      }
    });

    // Clicking on a custom tab button.
    $('body').on('click', '.wcCustomTab > .wcFrameButton', function() {
      self.$container.removeClass('wcDisableSelection');
      for (var i = 0; i < self._tabList.length; ++i) {
        var customTab = self._tabList[i];
        if (customTab.$close[0] === this) {
          var tabIndex = customTab.tab();
          customTab.removeTab(tabIndex);
          return;
        }

        if (customTab.$tabLeft[0] === this) {
          customTab._tabScrollPos-=customTab.$title.width()/2;
          if (customTab._tabScrollPos < 0) {
            customTab._tabScrollPos = 0;
          }
          customTab.__updateTabs();
          return;
        }
        if (customTab.$tabRight[0] === this) {
          customTab._tabScrollPos+=customTab.$title.width()/2;
          customTab.__updateTabs();
          return;
        }
      }
    });

    // Middle mouse button on a panel tab to close it.
    $('body').on('mouseup', '.wcPanelTab', function(event) {
      if (event.which !== 2) {
        return;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$title[0] === $(this).parents('.wcFrameTitle')[0]) {
          var panel = frame._panelList[index];
          if (self._removingPanel === panel) {
            self.removePanel(panel);
            self.__update();
          }
          return;
        }
      }
    });

    // Mouse down on a splitter bar will allow you to resize them.
    $('body').on('mousedown', '.wcSplitterBar', function(event) {
      if (event.which !== 1) {
        return true;
      }

      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          self._draggingSplitter.$pane[0].addClass('wcResizing');
          self._draggingSplitter.$pane[1].addClass('wcResizing');
          break;
        }
      }
      return true;
    });

    // Mouse down on a frame title will allow you to move them.
    $('body').on('mousedown', '.wcFrameTitle', function(event) {
      if (event.which === 3) {
        return true;
      }
      if ($(event.target).hasClass('wcFrameButton')) {
        return false;
      }
      
      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$title[0] == this) {
          self._draggingFrame = self._frameList[i];

          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };
          self._draggingFrame.__anchorMove(mouse);

          var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab'); 
          if ($panelTab && $panelTab.length) {
            var index = parseInt($panelTab.attr('id'));
            self._draggingFrame.panel(index, true);

            // if (event.which === 2) {
            //   self._draggingFrame = null;
            //   return;
            // }

            self._draggingFrameTab = $panelTab[0];
          }

          // If the window is able to be docked, give it a dark shadow tint and
          // begin the movement process
          if ((!self._draggingFrame.$title.hasClass('wcNotMoveable') && !$panelTab.hasClass('wcNotMoveable')) &&
          (!self._draggingFrame._isFloating || event.which !== 1 || self._draggingFrameTab)) {
            var rect = self._draggingFrame.__rect();
            self._ghost = new wcGhost(rect, mouse, self);
            self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, true);
            self.trigger(wcDocker.EVENT_BEGIN_DOCK);
          }
          break;
        }
      }
      for (var i = 0; i < self._tabList.length; ++i) {
        if (self._tabList[i].$title[0] == this) {
          self._draggingCustomTabFrame = self._tabList[i];

          var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab');
          if ($panelTab && $panelTab.length) {
            var index = parseInt($panelTab.attr('id'));
            self._draggingCustomTabFrame.tab(index, true);
            self._draggingFrameTab = $panelTab[0];
          }
          break;
        }
      }
      if (self._draggingFrame) {
        self.__focus(self._draggingFrame);
      }
      return true;
    });

    // Mouse down on a panel will put it into focus.
    $('body').on('mousedown', '.wcLayout', function(event) {
      if (event.which === 3) {
        return true;
      }
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].panel().layout().scene()[0] == this) {
          setTimeout(function() {
            self.__focus(self._frameList[i]);
          }, 10);
          break;
        }
      }
      return true;
    });

    // Floating frames have resizable edges.
    $('body').on('mousedown', '.wcFrameEdge', function(event) {
      if (event.which === 3) {
        return true;
      }
      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i]._isFloating) {
          if (self._frameList[i].$top[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top'];
            break;
          } else if (self._frameList[i].$bottom[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom'];
            break;
          } else if (self._frameList[i].$left[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['left'];
            break;
          } else if (self._frameList[i].$right[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['right'];
            break;
          } else if (self._frameList[i].$corner1[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top', 'left'];
            break;
          } else if (self._frameList[i].$corner2[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top', 'right'];
            break;
          } else if (self._frameList[i].$corner3[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom', 'right'];
            break;
          } else if (self._frameList[i].$corner4[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom', 'left'];
            break;
          }
        }
      }
      if (self._draggingFrame) {
        self.__focus(self._draggingFrame);
      }
      return true;
    });

    // Mouse move will allow you to move an object that is being dragged.
    $('body').on('mousemove', function(event) {
      if (event.which === 3) {
        return true;
      }
      if (self._draggingSplitter) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        self._draggingSplitter.__moveBar(mouse);
        self._draggingSplitter.__update();
      } else if (self._draggingFrameSizer) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        var offset = self.$container.offset();
        mouse.x += offset.left;
        mouse.y += offset.top;

        self._draggingFrame.__resize(self._draggingFrameSizer, mouse);
        self._draggingFrame.__update();
      } else if (self._draggingFrame) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        if (self._ghost) {
          self._ghost.__move(mouse);

          var forceFloat = !(self._draggingFrame._isFloating || event.which === 1);
          var found = false;

          // Check anchoring with self.
          if (!self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, self._draggingFrame._panelList.length > 1 && self._draggingFrameTab)) {
            self._draggingFrame.__shadow(true);
            if (!forceFloat) {
              for (var i = 0; i < self._frameList.length; ++i) {
                if (self._frameList[i] !== self._draggingFrame) {
                  if (self._frameList[i].__checkAnchorDrop(mouse, false, self._ghost, true)) {
                    // self._draggingFrame.__shadow(true);
                    return;
                  }
                }
              }
            }

            self._ghost.anchor(mouse, null);
          } else {
            self._draggingFrame.__shadow(false);
            var $hoverTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab');
            if (self._draggingFrameTab && $hoverTab && $hoverTab.length && self._draggingFrameTab !== event.target) {
              self._draggingFrameTab = self._draggingFrame.__tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
            }
          }
        } else if (!self._draggingFrameTab) {
          self._draggingFrame.__move(mouse);
          self._draggingFrame.__update();
        }
      } else if (self._draggingCustomTabFrame) {
        var $hoverTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab');
        if (self._draggingFrameTab && $hoverTab && $hoverTab.length && self._draggingFrameTab !== event.target) {
          self._draggingFrameTab = self._draggingCustomTabFrame.moveTab(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
        }
      }
      return true;
    });

    // Mouse released
    $('body').on('mouseup', function(event) {
      if (event.which === 3) {
        return true;
      }
      self.$container.removeClass('wcDisableSelection');
      if (self._draggingFrame) {
        for (var i = 0; i < self._frameList.length; ++i) {
          self._frameList[i].__shadow(false);
        }
      }

      if (self._ghost && self._draggingFrame) {
        var anchor = self._ghost.anchor();

        if (!anchor) {
          var index = self._draggingFrame._curTab;
          if (!self._draggingFrameTab) {
            self._draggingFrame.panel(0);
          }

          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };

          if (self._draggingFrameTab || !self.__isLastFrame(self._draggingFrame)) {
            var panel = self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_FLOAT);
            // Dragging the entire frame.
            if (!self._draggingFrameTab) {
              while (self._draggingFrame.panel())
              self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_STACKED, panel);
            }

            var frame = panel._parent;
            if (frame instanceof wcFrame) {
              frame.pos(mouse.x, mouse.y + self._ghost.__rect().h/2 - 10, true);
              frame.panel(index);

              frame._size.x = self._ghost.__rect().w;
              frame._size.y = self._ghost.__rect().h;
            }

            frame.__update();
          }
        } else if (!anchor.self) {
          var index = self._draggingFrame._curTab;
          if (!self._draggingFrameTab) {
            self._draggingFrame.panel(0);
          }
          var panel;
          if (anchor.item) {
            panel = anchor.item._parent;
          }
          // If we are dragging a tab to split its own container, find another
          // tab item within the same frame and split from there.
          if (panel === self._draggingFrame.panel()) {
            for (var i = 0; i < self._draggingFrame._panelList.length; ++i) {
              if (panel !== self._draggingFrame._panelList[i]) {
                panel = self._draggingFrame._panelList[i];
                index--;
                break;
              }
            }
          }
          panel = self.movePanel(self._draggingFrame.panel(), anchor.loc, panel, self._ghost.rect());
          panel._parent.panel(panel._parent._panelList.length-1, true);
          // Dragging the entire frame.
          if (!self._draggingFrameTab) {
            while (self._draggingFrame.panel()) {
              self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_STACKED, panel, self._ghost.rect());
            }
          } else {
            var frame = panel._parent;
            if (frame instanceof wcFrame) {
              index = index + frame._panelList.length;
            }
          }

          var frame = panel._parent;
          if (frame instanceof wcFrame) {
            frame.panel(index);
          }
        }
        self._ghost.destroy();
        self._ghost = null;

        self.trigger(wcDocker.EVENT_END_DOCK);
      }

      if ( self._draggingSplitter ) { 
        self._draggingSplitter.$pane[0].removeClass('wcResizing');
        self._draggingSplitter.$pane[1].removeClass('wcResizing');
      }

      self._draggingSplitter = null;
      self._draggingFrame = null;
      self._draggingFrameSizer = null;
      self._draggingFrameTab = null;
      self._draggingCustomTabFrame = null;
      self._removingPanel = null;
      return true;
    });

    // Middle mouse button on a panel tab to close it.
    $('body').on('mousedown', '.wcPanelTab', function(event) {
      if (event.which !== 2) {
        return;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$title[0] === $(this).parents('.wcFrameTitle')[0]) {
          var panel = frame._panelList[index];
          self._removingPanel = panel;
          return;
        }
      }
    });
  },

  // Updates the sizing of all panels inside this window.
  __update: function() {
    if (this._root) {
      this._root.__update();
    }

    for (var i = 0; i < this._floatingList.length; ++i) {
      this._floatingList[i].__update();
    }
  },

  // On window resized event.
  __resize: function(event) {
    this._resizeData.time = new Date();
    if (!this._resizeData.timeout) {
      this._resizeData.timeout = true;
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
      this.__trigger(wcDocker.EVENT_RESIZE_STARTED);
    }
    this.__trigger(wcDocker.EVENT_RESIZED);
    this.__update();
  },

  // On window resize event ended.
  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT_RESIZE_ENDED);
    }
  },

  // Brings a floating window to the top.
  // Params:
  //    frame     The frame to focus.
  //    flash     Whether to flash the frame.
  __focus: function(frame, flash) {
    var reorder = this._focusFrame != frame;
    if (this._focusFrame) {
      if (this._focusFrame._isFloating) {
        this._focusFrame.$frame.removeClass('wcFloatingFocus');
      }

      this._focusFrame.__trigger(wcDocker.EVENT_LOST_FOCUS);
      this._focusFrame = null;
    }

    this._focusFrame = frame;
    if (this._focusFrame) {
      if (this._focusFrame._isFloating) {
        this._focusFrame.$frame.addClass('wcFloatingFocus');

        if (reorder) {
          $('body').append(this._focusFrame.$frame);
        }
      }
      this._focusFrame.__focus(flash);

      this._focusFrame.__trigger(wcDocker.EVENT_GAIN_FOCUS);
    }
  },

  // Triggers an event exclusively on the docker and none of its panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  __trigger: function(eventName, data) {
    if (!eventName) {
      return;
    }

    if (this._events[eventName]) {
      for (var i = 0; i < this._events[eventName].length; ++i) {
        this._events[eventName][i].call(this, data);
      }
    }
  },

  // Checks a given panel to see if it is the final remaining
  // moveable panel in the docker.
  // Params:
  //    panel     The panel.
  // Returns:
  //    true      The panel is the last.
  //    false     The panel is not the last.
  __isLastPanel: function(panel) {
    for (var i = 0; i < this._frameList.length; ++i) {
      var testFrame = this._frameList[i];
      if (testFrame._isFloating) {
        continue;
      }
      for (var a = 0; a < testFrame._panelList.length; ++a) {
        var testPanel = testFrame._panelList[a];
        if (testPanel !== panel && testPanel.moveable()) {
          return false;
        }
      }
    }

    return true;
  },

  // Checks a given frame to see if it is the final remaining
  // moveable frame in the docker.
  // Params:
  //    frame     The frame.
  // Returns:
  //    true      The panel is the last.
  //    false     The panel is not the last.
  __isLastFrame: function(frame) {
    for (var i = 0; i < this._frameList.length; ++i) {
      var testFrame = this._frameList[i];
      if (testFrame._isFloating || testFrame === frame) {
        continue;
      }
      for (var a = 0; a < testFrame._panelList.length; ++a) {
        var testPanel = testFrame._panelList[a];
        if (testPanel.moveable()) {
          return false;
        }
      }
    }

    return true;
  },

  // For restore, creates the appropriate object type.
  __create: function(data, parent, $container) {
    switch (data.type) {
      case 'wcSplitter':
        var splitter = new wcSplitter($container, parent, data.horizontal);
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);
        return splitter;

      case 'wcFrame':
        var frame = new wcFrame($container, parent, data.floating);
        this._frameList.push(frame);
        if (data.floating) {
          this._floatingList.push(frame);
        }
        return frame;

      case 'wcPanel':
        for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
          if (this._dockPanelTypeList[i].name === data.panelType) {
            var panel = new wcPanel(data.panelType, this._dockPanelTypeList[i].options);
            panel._parent = parent;
            panel.__container(this.$transition);
            var options = (this._dockPanelTypeList[i].options && this._dockPanelTypeList[i].options.options) || {};
            panel._panelObject = new this._dockPanelTypeList[i].options.onCreate(panel, options);
            panel.__container($container);
            break;
          }
        }
        return panel;
    }

    return null;
  },

  // Creates a new frame for the panel and then attaches it
  // to the window.
  // Params:
  //    panel         The panel to insert.
  //    location      The desired location for the panel.
  //    parentPanel  An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  __addPanelAlone: function(panel, location, parentPanel, rect) {
    // Floating windows need no placement.
    if (location === wcDocker.DOCK_FLOAT || location === wcDocker.DOCK_MODAL) {
      var frame = new wcFrame(this.$container, this, true);
      this._frameList.push(frame);
      this._floatingList.push(frame);
      this.__focus(frame);
      frame.addPanel(panel);
      frame.pos(panel._pos.x, panel._pos.y, false);

      if (location === wcDocker.DOCK_MODAL) {
        frame.$modalBlocker = $('<div class="wcModalBlocker"></div>');
        frame.$frame.prepend(frame.$modalBlocker);

        panel.moveable(false);
        frame.$frame.addClass('wcModal');
        this._modalList.push(frame);
      }

      if (rect) {
        if (rect.hasOwnProperty('x') && rect.hasOwnProperty('y')) {
          frame.pos(rect.x + rect.w/2, rect.y + rect.h/2, true);
        }
        frame._size = {
          x: rect.w,
          y: rect.h,
        };
      }
      return;
    }

    if (parentPanel) {
      var parentFrame = parentPanel._parent;
      if (parentFrame instanceof wcFrame) {
        var parentSplitter = parentFrame._parent;
        if (parentSplitter instanceof wcSplitter) {
          var splitter;
          var left  = parentSplitter.pane(0);
          var right = parentSplitter.pane(1);
          var size = {
            x: -1,
            y: -1,
          };
          if (left === parentFrame) {
            splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
            parentSplitter.pane(0, splitter);
            size.x = parentSplitter.$pane[0].width();
            size.y = parentSplitter.$pane[0].height();
          } else {
            splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
            parentSplitter.pane(1, splitter);
            size.x = parentSplitter.$pane[1].width();
            size.y = parentSplitter.$pane[1].height();
          }

          if (splitter) {
            splitter.scrollable(0, false, false);
            splitter.scrollable(1, false, false);
            frame = new wcFrame(this.$transition, splitter, false);
            this._frameList.push(frame);
            if (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP) {
              splitter.pane(0, frame);
              splitter.pane(1, parentFrame);
            } else {
              splitter.pane(0, parentFrame);
              splitter.pane(1, frame);
            }

            if (!rect) {
              rect = {
                w: panel._size.x,
                h: panel._size.y,
              };
            }

            if (rect) {
              if (rect.w < 0) {
                rect.w = size.x/2;
              }
              if (rect.h < 0) {
                rect.h = size.y/2;
              }

              if (location === wcDocker.DOCK_LEFT) {
                splitter.pos(rect.w / size.x);
              } else if (location === wcDocker.DOCK_RIGHT) {
                splitter.pos(1.0 - (rect.w / size.x));
              } else if (location === wcDocker.DOCK_TOP) {
                splitter.pos(rect.h / size.y);
              } else {
                splitter.pos(1.0 - (rect.h / size.y));
              }
            } else {
              splitter.pos(0.5);
            }

            frame.addPanel(panel);
          }
          return;
        }
      }
    }

    var frame = new wcFrame(this.$transition, this, false);
    this._frameList.push(frame);

    if (!this._root) {
      this._root = frame;
      frame.__container(this.$container);
    } else {
      var splitter = new wcSplitter(this.$container, this, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
      if (splitter) {
        frame._parent = splitter;
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);
        var size = {
          x: this.$container.width(),
          y: this.$container.height(),
        };

        if (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP) {
          splitter.pane(0, frame);
          splitter.pane(1, this._root);
        } else {
          splitter.pane(0, this._root);
          splitter.pane(1, frame);
        }

        if (!rect) {
          splitter.__findBestPos();
        } else {
          if (rect.w < 0) {
            rect.w = size.x/2;
          }
          if (rect.h < 0) {
            rect.h = size.y/2;
          }

          if (location === wcDocker.DOCK_LEFT) {
            splitter.pos(rect.w / size.x);
          } else if (location === wcDocker.DOCK_RIGHT) {
            splitter.pos(1.0 - (rect.w / size.x));
          } else if (location === wcDocker.DOCK_TOP) {
            splitter.pos(rect.h / size.y);
          } else {
            splitter.pos(1.0 - (rect.h / size.y));
          }
        }

        this._root = splitter;
      }
    }

    frame.addPanel(panel);
  },

  // Attempts to insert a given dock panel into an already existing frame.
  // If insertion is not possible for any reason, the panel will be
  // placed in its own frame instead.
  // Params:
  //    panel         The panel to insert.
  //    location      The desired location for the panel.
  //    parentPanel   An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  __addPanelGrouped: function(panel, location, parentPanel) {
    if (parentPanel) {
      var frame = parentPanel._parent;
      if (frame instanceof wcFrame) {
        frame.addPanel(panel);
        return;
      }
    }

    // Floating windows need no placement.
    if (location === wcDocker.DOCK_FLOAT) {
      var frame;
      if (this._floatingList.length) {
        frame = this._floatingList[this._floatingList.length-1];
      }
      if (!frame) {
        this.__addPanelAlone(panel, location);
        return;
      }
      frame.addPanel(panel);
      return;
    }

    var needsHorizontal = location !== wcDocker.DOCK_BOTTOM;

    function ___iterateParents(item) {
      if (item instanceof wcSplitter) {
        var left = item.pane(0);
        var right = item.pane(1);

        // Check if the orientation of the splitter is one that we want.
        if (item.orientation() === needsHorizontal) {
          // Make sure the dock panel is on the proper side.
          if (left instanceof wcFrame && (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP)) {
            left.addPanel(panel);
            return true;
          } else if (right instanceof wcFrame && (location === wcDocker.DOCK_RIGHT || location === wcDocker.DOCK_BOTTOM)) {
            right.addPanel(panel);
            return true;
          }

          // This splitter was not valid, continue iterating through parents.
        }

        // If it isn't, iterate to which ever pane is not a dock panel.
        if (!(left instanceof wcFrame)) {
          return ___iterateParents.call(this, left);
        } else {
          return ___iterateParents.call(this, right);
        }
      }
      return false;
    };

    if (!___iterateParents.call(this, this._root)) {
      // If we did not manage to find a place for this panel, last resort is to put it in its own frame.
      this.__addPanelAlone(panel, location);
    }
  },
};

/*
  A ghost object that follows the mouse around during dock movement.
*/
function wcGhost(rect, mouse, docker) {
  this.$ghost = null;
  this._rect;
  this._anchorMouse = false;
  this._anchor = null;
  this._docker = docker;

  this.__init(rect, mouse);
};

wcGhost.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // --------------------------------------------------------------------------------
  // Updates the ghost based on the given screen position.
  update: function(position) {
    this.__move(position);

    for (var i = 0; i < this._docker._floatingList.length; ++i) {
      var rect = this._docker._floatingList[i].__rect();
      if (position.x > rect.x && position.y > rect.y 
        && position.x < rect.x + rect.w && position.y < rect.y + rect.h) {

        if (!this._docker._floatingList[i].__checkAnchorDrop(position, false, this, true)) {
          this.anchor(position, null);
        } else {
          this._anchor.panel = this._docker._floatingList[i].panel();
        }
        return;
      }
    }

    for (var i = 0; i < this._docker._frameList.length; ++i) {
      var rect = this._docker._frameList[i].__rect();
      if (position.x > rect.x && position.y > rect.y 
        && position.x < rect.x + rect.w && position.y < rect.y + rect.h) {

        if (!this._docker._frameList[i].__checkAnchorDrop(position, false, this, true)) {
          this.anchor(position, null);
        } else {
          this._anchor.panel = this._docker._frameList[i].panel();
        }
        return;
      }
    }
  },

  // --------------------------------------------------------------------------------
  // Get, or Sets the ghost's anchor.
  // Params:
  //    mouse     The current mouse position.
  //    anchor    If supplied, assigns a new anchor.
  anchor: function(mouse, anchor) {
    if (typeof mouse === 'undefined') {
      return this._anchor;
    }

    if (anchor && this._anchor && anchor.loc === this._anchor.loc && anchor.item === this._anchor.item) {
      return;
    }

    var rect = {
      x: parseInt(this.$ghost.css('left')),
      y: parseInt(this.$ghost.css('top')),
      w: parseInt(this.$ghost.css('width')),
      h: parseInt(this.$ghost.css('height')),
    };

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect.x = -this._anchorMouse.x;
    this._rect.y = -this._anchorMouse.y;

    if (!anchor) {
      if (!this._anchor) {
        return;
      }

      this._anchor = null;
      this.$ghost.show();
      this.$ghost.stop().animate({
        opacity: 0.3,
        'margin-left': this._rect.x - this._rect.w/2 + 'px',
        'margin-top': this._rect.y - 10 + 'px',
        width: this._rect.w + 'px',
        height: this._rect.h + 'px',
      }, 150);
      return;
    }

    this._anchor = anchor;
    var opacity = 0.8;
    if (anchor.self && anchor.loc === wcDocker.DOCK_STACKED) {
      opacity = 0;
      this.$ghost.hide();
    } else {
      this.$ghost.show();
    }
    this.$ghost.stop().animate({
      opacity: opacity,
      'margin-left': '2px',
      'margin-top': '2px',
      border: '0px',
      left: anchor.x + 'px',
      top: anchor.y + 'px',
      width: anchor.w + 'px',
      height: anchor.h + 'px',
    }, 150);
  },

  // --------------------------------------------------------------------------------
  rect: function() {
    return {
      x: this.$ghost.offset().left,
      y: this.$ghost.offset().top,
      w: parseInt(this.$ghost.css('width')),
      h: parseInt(this.$ghost.css('height')),
    };
  },

  // --------------------------------------------------------------------------------
  destroy: function() {
    this.__destroy();
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function(rect, mouse) {
    this.$ghost = $('<div class="wcGhost">')
      .css('opacity', 0)
      .css('top', rect.y + 'px')
      .css('left', rect.x + 'px')
      .css('width', rect.w + 'px')
      .css('height', rect.h + 'px');

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect = {
      x: -this._anchorMouse.x,
      y: -this._anchorMouse.y,
      w: rect.w,
      h: rect.h,
    };

    $('body').append(this.$ghost);

    this.anchor(mouse, rect);
  },

  // Updates the size of the layout.
  __move: function(mouse) {
    if (this._anchor) {
      return;
    }

    var x = parseInt(this.$ghost.css('left'));
    var y = parseInt(this.$ghost.css('top'));

    x = mouse.x + this._anchorMouse.x;
    y = mouse.y + this._anchorMouse.y;

    this.$ghost.css('left', x + 'px');
    this.$ghost.css('top',  y + 'px');
  },

  // Gets the original size of the moving widget.
  __rect: function() {
    return this._rect;
  },

  // Exorcise the ghost.
  __destroy: function() {
    this.$ghost.stop().animate({
      opacity: 0.0,
    }, {
      duration: 175,
      complete: function() {
        $(this).remove();
      },
    });
  },
};
/*
  Handles the contents of a panel.
*/
function wcLayout(container, parent) {
  this.$container = $(container);
  this._parent = parent;

  this._batchProcess = false;
  this._grid = [];
  this.$table = null;

  this.__init();
};

wcLayout.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Adds an item into the layout, expanding the grid
  // size if necessary.
  // Params:
  //    item        The DOM element to add.
  //    x, y        The grid coordinates to place the item.
  //    w, h        If supplied, will stretch the item among
  //                multiple grid elements.
  // Returns:
  //    <td>        On success, returns the jquery <td> dom element.
  //    false       A failure happened, most likely cells could not be merged.
  addItem: function(item, x, y, w, h) {
    if (typeof x === 'undefined' || x < 0) {
      x = 0;
    }
    if (typeof y === 'undefined' || y < 0) {
      y = 0;
    }
    if (typeof w === 'undefined' || w <= 0) {
      w = 1;
    }
    if (typeof h === 'undefined' || h <= 0) {
      h = 1;
    }

    this.__resizeGrid(x + w - 1, y + h - 1);
    if (w > 1 || h > 1) {
      if (!this.__mergeGrid(x, y, w, h)) {
        return false;
      }
    }

    this._grid[y][x].$el.append($(item));
    return this._grid[y][x].$el;
  },

  // Retrieves the table item at a given grid position, if it exists.
  // Note, if an element spans multiple cells, only the top-left
  // cell will retrieve the item.
  // Params:
  //    x, y        The grid position.
  // Return:
  //    <td>        On success, returns the found jquery <td> dom element.
  //    null        If no element was found.
  item: function(x, y) {
    if (y >= this._grid.length) {
      return null;
    }

    if (x >= this._grid[y].length) {
      return null;
    }

    return this._grid[y][x].$el;
  },

  // Clears the layout.
  clear: function() {
    var showGrid = this.showGrid();
    var spacing = this.gridSpacing();
    var alternate = this.gridAlternate();

    this.$table.remove();
    this.__init();

    this.showGrid(showGrid);
    this.gridSpacing(spacing);
    this.gridAlternate(alternate);

    this._grid = [];
  },

  // Begins a batch operation.  Basically it refrains from constructing
  // the layout grid, which causes a reflow, on each item added.  Instead,
  // The grid is only generated at the end once FinishBatch() is called.
  startBatch: function() {
    this._batchProcess = true;
  },

  // Ends a batch operation. See startBatch() for information.
  finishBatch: function() {
    this._batchProcess = false;
    this.__resizeGrid(0, 0);
  },

  // Gets, or Sets the visible status of the layout grid.
  // Params:
  //    enabled     If supplied, will set the grid shown or hidden.
  // Returns:
  //    bool        The current visibility of the grid.
  showGrid: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGrid', enabled);
    }

    return this.$table.hasClass('wcLayoutGrid');
  },

  // Version 1.0.1
  // Gets, or Sets the spacing between cell borders.
  // Params:
  //    size      If supplied, sets the pixel size of the border spacing.
  // Returns:
  //    int       The current border spacing size.
  gridSpacing: function(size) {
    if (typeof size !== 'undefined') {
      this.$table.css('border-spacing', size + 'px');
    }

    return parseInt(this.$table.css('border-spacing'));
  },

  // Version 1.0.1
  // Gets, or Sets whether the table rows alternate in color.
  // Params:
  //    enabled     If supplied, will set whether the grid alternates in color.
  // Returns:
  //    bool        Whether the grid alternates in color.
  gridAlternate: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGridAlternate', enabled);
    }

    return this.$table.hasClass('wcLayoutGridAlternate');
  },

  // Retrieves the main scene DOM element.
  scene: function() {
    return this.$table;
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$table = $('<table class="wcLayout wcWide wcTall"></table>');
    this.$table.append($('<tbody></tbody>'));
    this.__container(this.$container);
  },

  // Updates the size of the layout.
  __update: function() {
  },

  // Resizes the grid to fit a given position.
  // Params:
  //    width     The width to expand to.
  //    height    The height to expand to.
  __resizeGrid: function(width, height) {
    for (var y = 0; y <= height; ++y) {
      if (this._grid.length <= y) {
        this._grid.push([]);
      }

      for (var x = 0; x <= width; ++x) {
        if (this._grid[y].length <= x) {
          this._grid[y].push({
            $el: $('<td>'),
            x: 0,
            y: 0,
          });
        }
      }
    }

    if (!this._batchProcess) {
      var $oldBody = this.$table.find('tbody');
      $('.wcDockerTransition').append($oldBody);

      var $newBody = $('<tbody>');
      for (var y = 0; y < this._grid.length; ++y) {
        var $row = null;

        for (var x = 0; x < this._grid[y].length; ++x) {
          var item = this._grid[y][x];
          if (item.$el) {
            if (!$row) {
              $row = $('<tr>');
              $newBody.append($row);
            }

            $row.append(item.$el);
          }
        }
      }

      this.$table.append($newBody);
      $oldBody.remove();
    }
  },

  // Merges cells in the layout.
  // Params:
  //    x, y      Cell position to begin merge.
  //    w, h      The width and height to merge.
  // Returns:
  //    true      Cells were merged succesfully.
  //    false     Merge failed, either because the grid position was out of bounds
  //              or some of the cells were already merged.
  __mergeGrid: function(x, y, w, h) {
    // Make sure each cell to be merged is not already merged somewhere else.
    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        var item = this._grid[y + yy][x + xx];
        if (!item.$el || item.x !== 0 || item.y !== 0) {
          return false;
        }
      }
    }

    // Now merge the cells here.
    var item = this._grid[y][x];
    if (w > 1) {
      item.$el.attr('colspan', '' + w);
      item.x = w-1;
    }
    if (h > 1) {
      item.$el.attr('rowspan', '' + h);
      item.y = h-1;
    }

    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        if (yy !== 0 || xx !== 0) {
          var item = this._grid[y + yy][x + xx];
          item.$el.remove();
          item.$el = null;
          item.x = -xx;
          item.y = -yy;
        }
      }
    }
    return true;
  },

  // Checks if the mouse is in a valid anchor position for nesting another widget.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit, $elem, title) {
    var width = $elem.width();
    var height = $elem.height();
    var offset = $elem.offset();
    var top = $elem.find('.wcFrameTitle').height();
    // var top = this.$table.offset().top - offset.top;
    if (!title) {
      top = 0;
    }

    if (same) {
      // Same tabs
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: top-2,
          loc: wcDocker.DOCK_STACKED,
          item: this,
          self: true,
        });
        return true;
      }
    }

    // Tab ordering or adding.
    if (title) {
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: top-2,
          loc: wcDocker.DOCK_STACKED,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (!canSplit) {
      return false;
    }

    if (width < height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK_TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top + (height - height*0.5),
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK_BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }

    // Left side docking
    if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
      if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK_LEFT,
          item: this,
          self: false,
        });
        return true;
      }

      // Right side docking
      if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left + width*0.5,
          y: offset.top,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK_RIGHT,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (width >= height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK_TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top + (height - height*0.5),
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK_BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }
    return false;
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
      this.$container.append(this.$table);
    } else {
      this.$table.remove();
    }
    return this.$container;
  },

  // Destroys the layout.
  __destroy: function() {
    this.__container(null);
    this._parent = null;
    this.clear();

    this.$table.remove();
    this.$table = null;
  },
};
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
  if (options.title) {
    this.title(options.title);
  }

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
    // data.title = this._title;
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
    // this._title = data.title;
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
/*
  The frame is a container for a panel, and can contain multiple panels inside it, each appearing
  as a tabbed item.  All docking panels have a frame, but the frame can change any time the panel
  is moved.
*/
function wcFrame(container, parent, isFloating) {
  this.$container = $(container);
  this._parent = parent;
  this._isFloating = isFloating;

  this.$frame     = null;
  this.$title     = null;
  this.$tabScroll = null;
  this.$center    = null;
  this.$tabLeft   = null;
  this.$tabRight  = null;
  this.$close     = null;
  this.$top       = null;
  this.$bottom    = null;
  this.$left      = null;
  this.$right     = null;
  this.$corner1   = null;
  this.$corner2   = null;
  this.$corner3   = null;
  this.$corner4   = null;

  this.$shadower  = null;
  this.$modalBlocker = null;

  this._canScrollTabs = false;
  this._tabScrollPos = 0;
  this._curTab = -1;
  this._panelList = [];
  this._buttonList = [];

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._pos = {
    x: 0.5,
    y: 0.5,
  };

  this._size = {
    x: 400,
    y: 400,
  };

  this._lastSize = {
    x: 400,
    y: 400,
  };

  this._anchorMouse = {
    x: 0,
    y: 0,
  };

  this.__init();
};

wcFrame.prototype = {
  LEFT_TAB_BUFFER: 15,

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Gets, or Sets the position of the frame.
  // Params:
  //    x, y    If supplied, assigns the new position.
  //    pixels  If true, the coordinates given will be treated as a
  //            pixel position rather than a percentage.
  pos: function(x, y, pixels) {
    var width = this.$container.width();
    var height = this.$container.height();

    if (typeof x === 'undefined') {
      if (pixels) {
        return {x: this._pos.x*width, y: this._pos.y*height};
      } else {
        return {x: this._pos.x, y: this._pos.y};
      }
    }

    if (pixels) {
      this._pos.x = x/width;
      this._pos.y = y/height;
    } else {
      this._pos.x = x;
      this._pos.y = y;
    }
  },

  // Gets the desired size of the panel.
  initSize: function() {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      if (size.x < this._panelList[i].initSize().x) {
        size.x = this._panelList[i].initSize().x;
      }
      if (size.y < this._panelList[i].initSize().y) {
        size.y = this._panelList[i].initSize().y;
      }
    }

    if (size.x < 0 || size.y < 0) {
      return false;
    }
    return size;
  },

  // Gets the minimum size of the panel.
  minSize: function() {
    var size = {
      x: 0,
      y: 0,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      size.x = Math.max(size.x, this._panelList[i].minSize().x);
      size.y = Math.max(size.y, this._panelList[i].minSize().y);
    }
    return size;
  },

  // Gets the minimum size of the panel.
  maxSize: function() {
    var size = {
      x: Infinity,
      y: Infinity,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      size.x = Math.min(size.x, this._panelList[i].maxSize().x);
      size.y = Math.min(size.y, this._panelList[i].maxSize().y);
    }
    return size;
  },

  // Adds a given panel as a new tab item.
  // Params:
  //    panel    The panel to add.
  //    index     An optional index to insert the tab at.
  addPanel: function(panel, index) {
    var found = this._panelList.indexOf(panel);
    if (found !== -1) {
      this._panelList.splice(found, 1);
    }

    if (typeof index === 'undefined') {
      this._panelList.push(panel);
    } else {
      this._panelList.splice(index, 0, panel);
    }

    if (this._curTab === -1 && this._panelList.length) {
      this._curTab = 0;
      this._size = this.initSize();
    }

    this.__updateTabs();
  },

  // Removes a given panel from the tab item.
  // Params:
  //    panel       The panel to remove.
  // Returns:
  //    bool        Returns whether or not any panels still remain.
  removePanel: function(panel) {
    for (var i = 0; i < this._panelList.length; ++i) {
      if (this._panelList[i] === panel) {
        if (this._curTab >= i) {
          this._curTab--;
        }

        this._panelList[i].__container(null);
        this._panelList[i]._parent = null;

        this._panelList.splice(i, 1);
        break;
      }
    }

    if (this._curTab === -1 && this._panelList.length) {
      this._curTab = 0;
    }

    this.__updateTabs();
    return this._panelList.length > 0;
  },

  // Gets, or Sets the currently visible panel.
  // Params:
  //    tabIndex      If supplied, sets the current tab.
  // Returns:
  //    wcPanel       The currently visible panel.
  panel: function(tabIndex, autoFocus) {
    if (typeof tabIndex !== 'undefined') {
      if (tabIndex > -1 && tabIndex < this._panelList.length) {
        this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        this._curTab = tabIndex;
        this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + tabIndex + '"]').addClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + tabIndex + '"]').removeClass('wcPanelTabContentHidden');
        this.__updateTabs(autoFocus);
      }
    }

    if (this._curTab > -1 && this._curTab < this._panelList.length) {
      return this._panelList[this._curTab];
    }
    return false;
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$frame     = $('<div class="wcFrame wcWide wcTall wcPanelBackground">');
    this.$title     = $('<div class="wcFrameTitle">');
    this.$tabScroll = $('<div class="wcTabScroller">');
    this.$center    = $('<div class="wcFrameCenter wcWide">');
    this.$tabLeft   = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
    this.$tabRight  = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
    this.$close     = $('<div class="wcFrameButton" title="Close the currently active panel tab"><div class="fa fa-close"></div>X</div>');
    // this.$frame.append(this.$title);
    this.$title.append(this.$tabScroll);
    this.$frame.append(this.$close);

    if (this._isFloating) {
      this.$top     = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('top', '-6px').css('left', '0px').css('right', '0px');
      this.$bottom  = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('bottom', '-6px').css('left', '0px').css('right', '0px');
      this.$left    = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('left', '-6px').css('top', '0px').css('bottom', '0px');
      this.$right   = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('right', '-6px').css('top', '0px').css('bottom', '0px');
      this.$corner1 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('top', '-6px').css('left', '-6px');
      this.$corner2 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('top', '-6px').css('right', '-6px');
      this.$corner3 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('bottom', '-6px').css('right', '-6px');
      this.$corner4 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('bottom', '-6px').css('left', '-6px');

      this.$frame.append(this.$top);
      this.$frame.append(this.$bottom);
      this.$frame.append(this.$left);
      this.$frame.append(this.$right);
      this.$frame.append(this.$corner1);
      this.$frame.append(this.$corner2);
      this.$frame.append(this.$corner3);
      this.$frame.append(this.$corner4);
    }

    this.$frame.append(this.$center);

    // Floating windows have no container.
    this.__container(this.$container);

    if (this._isFloating) {
      this.$frame.addClass('wcFloating');
    }

    this.$center.scroll(this.__scrolled.bind(this));
  },

  // Updates the size of the frame.
  __update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    // Floating windows manage their own sizing.
    if (this._isFloating) {
      var left = (this._pos.x * width) - this._size.x/2;
      var top = (this._pos.y * height) - this._size.y/2;

      if (top < 0) {
        top = 0;
      }

      if (left + this._size.x/2 < 0) {
        left = -this._size.x/2;
      }

      if (left + this._size.x/2 > width) {
        left = width - this._size.x/2;
      }

      if (top + parseInt(this.$center.css('top')) > height) {
        top = height - parseInt(this.$center.css('top'));
      }

      this.$frame.css('left', left + 'px');
      this.$frame.css('top', top + 'px');
      this.$frame.css('width', this._size.x + 'px');
      this.$frame.css('height', this._size.y + 'px');
    }

    if (width !== this._lastSize.x || height !== this._lastSize.y) {
      this._lastSize.x = width;
      this._lastSize.y = height;

      this._resizeData.time = new Date();
      if (!this._resizeData.timeout) {
        this._resizeData.timeout = true;
        setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
      }
    }
    // this.__updateTabs();
    this.__onTabChange();
  },

  __resizeEnd: function() {
    this.__updateTabs();
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
    }
  },

  // Triggers an event exclusively on the docker and none of its panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  __trigger: function(eventName, data) {
    for (var i = 0; i < this._panelList.length; ++i) {
      this._panelList[i].__trigger(eventName, data);
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type = 'wcFrame';
    data.floating = this._isFloating;
    data.isFocus = this.$frame.hasClass('wcFloatingFocus')
    data.pos = {
      x: this._pos.x,
      y: this._pos.y,
    };
    data.size = {
      x: this._size.x,
      y: this._size.y,
    };
    data.tab = this._curTab;
    data.panels = [];
    for (var i = 0; i < this._panelList.length; ++i) {
      data.panels.push(this._panelList[i].__save());
    }
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._isFloating = data.floating;
    this._pos.x = data.pos.x;
    this._pos.y = data.pos.y;
    this._size.x = data.size.x;
    this._size.y = data.size.y;
    this._curTab = data.tab;
    for (var i = 0; i < data.panels.length; ++i) {
      var panel = docker.__create(data.panels[i], this, this.$center);
      panel.__restore(data.panels[i], docker);
      this._panelList.push(panel);
    }

    this.__update();

    if (data.isFocus) {
      this.$frame.addClass('wcFloatingFocus');
    }
  },

  __updateTabs: function(autoFocus) {
    this.$tabScroll.empty();

    // Move all tabbed panels to a temporary element to preserve event handlers on them.
    // var $tempCenter = $('<div>');
    // this.$frame.append($tempCenter);
    // this.$center.children().appendTo($tempCenter);

    var visibilityChanged = [];
    var tabPositions = [];
    var totalWidth = 0;
    var parentLeft = this.$tabScroll.offset().left;
    var self = this;

    this.$title.removeClass('wcNotMoveable');

    this.$center.children('.wcPanelTabContent').each(function() {
      $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
    });

    var titleVisible = true;

    for (var i = 0; i < this._panelList.length; ++i) {
      var panel = this._panelList[i];

      var $tab = $('<div id="' + i + '" class="wcPanelTab">' + panel.title() + '</div>');
      this.$tabScroll.append($tab);
      if (panel.$icon) {
        $tab.prepend(panel.$icon);
      }

      $tab.toggleClass('wcNotMoveable', !panel.moveable());
      if (!panel.moveable()) {
        this.$title.addClass('wcNotMoveable');
      }

      // 
      if (!panel._titleVisible) {
        titleVisible = false;
      }

      var $tabContent = this.$center.children('.wcPanelTabContent[id="' + i + '"]');
      if (!$tabContent.length) {
        $tabContent = $('<div class="wcPanelTabContent wcPanelBackground wcPanelTabContentHidden" id="' + i + '">');
        this.$center.append($tabContent);
      }

      panel.__container($tabContent);
      panel._parent = this;

      var isVisible = this._curTab === i;
      if (panel.isVisible() !== isVisible) {
        visibilityChanged.push({
          panel: panel,
          isVisible: isVisible,
        });
      }

      $tabContent.removeClass('wcPanelTabUnused');

      if (isVisible) {
        $tab.addClass('wcPanelTabActive');
        $tabContent.removeClass('wcPanelTabContentHidden');
      }

      totalWidth = $tab.offset().left - parentLeft;
      tabPositions.push(totalWidth);

      totalWidth += $tab.outerWidth();
    }

    if (titleVisible) {
      this.$frame.prepend(this.$title);
      if (!this.$frame.parent()) {
        this.$center.css('top', '');
      }
    } else {
      this.$title.remove();
      this.$center.css('top', '0px');
    }

    // Now remove all unused panel tabs.
    this.$center.children('.wcPanelTabUnused').each(function() {
      $(this).remove();
    });

    // $tempCenter.remove();
    if (titleVisible) {
      var buttonSize = this.__onTabChange();

      if (autoFocus) {
        for (var i = 0; i < tabPositions.length; ++i) {
          if (i === this._curTab) {
            var left = tabPositions[i];
            var right = totalWidth;
            if (i+1 < tabPositions.length) {
              right = tabPositions[i+1];
            }

            var scrollPos = -parseInt(this.$tabScroll.css('left'));
            var titleWidth = this.$title.width() - buttonSize;

            // If the tab is behind the current scroll position.
            if (left < scrollPos) {
              this._tabScrollPos = left - this.LEFT_TAB_BUFFER;
              if (this._tabScrollPos < 0) {
                this._tabScrollPos = 0;
              }
            }
            // If the tab is beyond the current scroll position.
            else if (right - scrollPos > titleWidth) {
              this._tabScrollPos = right - titleWidth + this.LEFT_TAB_BUFFER;
            }
            break;
          }
        }
      }

      this._canScrollTabs = false;
      if (totalWidth > this.$title.width() - buttonSize) {
        this._canScrollTabs = titleVisible;
        this.$frame.append(this.$tabRight);
        this.$frame.append(this.$tabLeft);
        var scrollLimit = totalWidth - (this.$title.width() - buttonSize)/2;
        // If we are beyond our scroll limit, clamp it.
        if (this._tabScrollPos > scrollLimit) {
          var children = this.$tabScroll.children();
          for (var i = 0; i < children.length; ++i) {
            var $tab = $(children[i]);

            totalWidth = $tab.offset().left - parentLeft;
            if (totalWidth + $tab.outerWidth() > scrollLimit) {
              this._tabScrollPos = totalWidth - this.LEFT_TAB_BUFFER;
              if (this._tabScrollPos < 0) {
                this._tabScrollPos = 0;
              }
              break;
            }
          }
        }
      } else {
        this._tabScrollPos = 0;
        this.$tabLeft.remove();
        this.$tabRight.remove();
      }

      this.$tabScroll.stop().animate({left: -this._tabScrollPos + 'px'}, 'fast');

      // Update visibility on panels.
      for (var i = 0; i < visibilityChanged.length; ++i) {
        visibilityChanged[i].panel.__isVisible(visibilityChanged[i].isVisible);
      }
    }
  },

  __onTabChange: function() {
    var buttonSize = 0;
    var panel = this.panel();
    if (panel) {
      var scrollable = panel.scrollable();
      this.$center.toggleClass('wcScrollableX', scrollable.x);
      this.$center.toggleClass('wcScrollableY', scrollable.y);

      var overflowVisible = panel.overflowVisible();
      this.$center.toggleClass('wcOverflowVisible', overflowVisible);

      this.$tabLeft.remove();
      this.$tabRight.remove();

      while (this._buttonList.length) {
        this._buttonList.pop().remove();
      }

      if (panel.closeable()) {
        this.$close.show();
        buttonSize += this.$close.outerWidth();
      } else {
        this.$close.hide();
      }

      for (var i = 0; i < panel._buttonList.length; ++i) {
        var buttonData = panel._buttonList[i];
        var $button = $('<div>');
        var buttonClass = buttonData.className;
        $button.addClass('wcFrameButton');
        if (buttonData.isTogglable) {
          $button.addClass('wcFrameButtonToggler');

          if (buttonData.isToggled) {
            $button.addClass('wcFrameButtonToggled');
            buttonClass = buttonData.toggleClassName || buttonClass;
          }
        }
        $button.attr('title', buttonData.tip);
        $button.data('name', buttonData.name);
        $button.text(buttonData.text);
        if (buttonClass) {
          $button.prepend($('<div class="' + buttonClass + '">'));
        }

        this._buttonList.push($button);
        this.$frame.append($button);
        buttonSize += $button.outerWidth();
      }

      if (this._canScrollTabs) {
        this.$frame.append(this.$tabRight);
        this.$frame.append(this.$tabLeft);

        buttonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
      }

      panel.__update();

      this.$center.scrollLeft(panel._scroll.x);
      this.$center.scrollTop(panel._scroll.y);
    }
    return buttonSize;
  },

  // Handles scroll notifications.
  __scrolled: function() {
    var panel = this.panel();
    panel._scroll.x = this.$center.scrollLeft();
    panel._scroll.y = this.$center.scrollTop();

    panel.__trigger(wcDocker.EVENT_SCROLLED);
  },

  // Brings the frame into focus.
  // Params:
  //    flash     Optional, if true will flash the window.
  __focus: function(flash) {
    if (flash) {
      var $flasher = $('<div class="wcFrameFlasher">');
      this.$frame.append($flasher);
      $flasher.animate({
        opacity: 0.25,
      },100)
      .animate({
        opacity: 0.0,
      },100)
      .animate({
        opacity: 0.1,
      },50)
      .animate({
        opacity: 0.0,
      },50)
      .queue(function(next) {
        $flasher.remove();
        next();
      });
    }
  },

  // Moves the panel based on mouse dragging.
  // Params:
  //    mouse     The current mouse position.
  __move: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();

    this._pos.x = (mouse.x + this._anchorMouse.x) / width;
    this._pos.y = (mouse.y + this._anchorMouse.y) / height;
  },

  // Sets the anchor position for moving the panel.
  // Params:
  //    mouse     The current mouse position.
  __anchorMove: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();

    this._anchorMouse.x = (this._pos.x * width) - mouse.x;
    this._anchorMouse.y = (this._pos.y * height) - mouse.y;
  },

  // Moves a tab from a given index to another index.
  // Params:
  //    fromIndex     The current tab index to move.
  //    toIndex       The new index to move to.
  // Returns:
  //    element       The new element of the moved tab.
  //    false         If an error occurred.
  __tabMove: function(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this._panelList.length &&
        toIndex >= 0 && toIndex < this._panelList.length) {
      var panel = this._panelList.splice(fromIndex, 1);
      this._panelList.splice(toIndex, 0, panel[0]);

      // Preserve the currently active tab.
      if (this._curTab === fromIndex) {
        this._curTab = toIndex;
      }

      this.__updateTabs();

      return this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
    }
    return false;
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit) {
    var panel = this.panel();
    if (panel && panel.moveable()) {
      return panel.layout().__checkAnchorDrop(mouse, same, ghost, (!this._isFloating && canSplit), this.$frame, panel.moveable() && panel.title());
    }
    return false;
  },

  // Resizes the panel based on mouse dragging.
  // Params:
  //    edges     A list of edges being moved.
  //    mouse     The current mouse position.
  __resize: function(edges, mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.minSize();
    var maxSize = this.maxSize();

    var pos = {
      x: (this._pos.x * width) - this._size.x/2,
      y: (this._pos.y * height) - this._size.y/2,
    };

    for (var i = 0; i < edges.length; ++i) {
      switch (edges[i]) {
        case 'top':
          this._size.y += pos.y - mouse.y-2;
          pos.y = mouse.y+2;
          if (this._size.y < minSize.y) {
            pos.y += this._size.y - minSize.y;
            this._size.y = minSize.y;
          }
          if (this._size.y > maxSize.y) {
            pos.y += this._size.y - maxSize.y;
            this._size.y = maxSize.y;
          }
          break;
        case 'bottom':
          this._size.y = mouse.y-4 - pos.y;
          if (this._size.y < minSize.y) {
            this._size.y = minSize.y;
          }
          if (this._size.y > maxSize.y) {
            this._size.y = maxSize.y;
          }
          break;
        case 'left':
          this._size.x += pos.x - mouse.x-2;
          pos.x = mouse.x+2;
          if (this._size.x < minSize.x) {
            pos.x += this._size.x - minSize.x;
            this._size.x = minSize.x;
          }
          if (this._size.x > maxSize.x) {
            pos.x += this._size.x - maxSize.x;
            this._size.x = maxSize.x;
          }
          break;
        case 'right':
          this._size.x = mouse.x-4 - pos.x;
          if (this._size.x < minSize.x) {
            this._size.x = minSize.x;
          }
          if (this._size.x > maxSize.x) {
            this._size.x = maxSize.x;
          }
          break;
      }

      this._pos.x = (pos.x + this._size.x/2) / width;
      this._pos.y = (pos.y + this._size.y/2) / height;
    }
  },

  // Turn off or on a shadowing effect to signify this widget is being moved.
  // Params:
  //    enabled       Whether to enable __shadow mode.
  __shadow: function(enabled) {
    if (enabled) {
      if (!this.$shadower) {
        this.$shadower = $('<div class="wcFrameShadower">');
        this.$frame.append(this.$shadower);
        this.$shadower.animate({
          opacity: 0.5,
        }, 300);
      }
    } else {
      if (this.$shadower) {
        var self = this;
        this.$shadower.animate({
          opacity: 0.0,
        }, 300)
        .queue(function(next) {
          self.$shadower.remove();
          self.$shadower = null;
          next();
        });
      }
    }
  },

  // Retrieves the bounding rect for this frame.
  __rect: function() {
    var offset = this.$frame.offset();
    var width = this.$frame.width();
    var height = this.$frame.height();

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
      this.$container.append(this.$frame);
    } else {
      this.$frame.remove();
    }
    return this.$container;
  },

  // Disconnects and prepares this widget for destruction.
  __destroy: function() {
    this._curTab = -1;
    for (var i = 0; i < this._panelList.length; ++i) {
      this._panelList[i].__destroy();
    }

    while (this._panelList.length) this._panelList.pop();
    if (this.$modalBlocker) {
      this.$modalBlocker.remove();
      this.$modalBlocker = null;
    }
    this.__container(null);
    this._parent = null;
  },
};
/*
  Splits an area in two, dividing it with a resize splitter bar
*/
function wcSplitter(container, parent, orientation) {
  this.$container = $(container);
  this._parent = parent;
  this._orientation = orientation;

  this._pane = [false, false];
  this.$pane = [];
  this.$bar = null;
  this._pos = 0.5;
  this._findBestPos = false;

  this._boundEvents = [];

  this.__init();

  this.docker()._splitterList.push(this);
};

wcSplitter.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initializes the splitter with its own layouts.
  initLayouts: function() {
    var layout0 = new wcLayout(this.$pane[0], this);
    var layout1 = new wcLayout(this.$pane[1], this);
    this.pane(0, layout0);
    this.pane(1, layout1);
  },

  // Finds the main Docker window.
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  // Gets, or Sets the orientation of the splitter.
  orientation: function(value) {
    if (typeof value === 'undefined') {
      return this._orientation;
    }

    if (this._orientation != value) {
      this._orientation = value;

      if (this._orientation) {
        this.$pane[0].removeClass('wcWide').addClass('wcTall');
        this.$pane[1].removeClass('wcWide').addClass('wcTall');
        this.$bar.removeClass('wcWide').removeClass('wcSplitterBarH').addClass('wcTall').addClass('wcSplitterBarV');
      } else {
        this.$pane[0].removeClass('wcTall').addClass('wcWide');
        this.$pane[1].removeClass('wcTall').addClass('wcWide');
        this.$bar.removeClass('wcTall').removeClass('wcSplitterBarV').addClass('wcWide').addClass('wcSplitterBarH');
      }

      this.$pane[0].css('top', '').css('left', '').css('width', '').css('height', '');
      this.$pane[1].css('top', '').css('left', '').css('width', '').css('height', '');
      this.$bar.css('top', '').css('left', '').css('width', '').css('height', '');
      this.__update();
    }
  },

  // Gets the minimum size of the widget.
  minSize: function() {
    var minSize1;
    var minSize2;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize1 = this._pane[0].minSize();
    }

    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      minSize2 = this._pane[1].minSize();
    }

    if (minSize1 && minSize2) {
      if (this._orientation) {
        minSize1.x += minSize2.x;
        minSize1.y = Math.max(minSize1.y, minSize2.y);
      } else {
        minSize1.y += minSize2.y;
        minSize1.x = Math.max(minSize1.x, minSize2.x);
      }
      return minSize1;
      return {
        x: Math.min(minSize1.x, minSize2.x),
        y: Math.min(minSize1.y, minSize2.y),
      };
    } else if (minSize1) {
      return minSize1;
    } else if (minSize2) {
      return minSize2;
    }

    return false;
  },

  // Gets the minimum size of the widget.
  maxSize: function() {
    var maxSize1;
    var maxSize2;
    if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
      maxSize1 = this._pane[0].maxSize();
    }

    if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
      maxSize2 = this._pane[1].maxSize();
    }

    if (maxSize1 && maxSize2) {
      if (this._orientation) {
        maxSize1.x += maxSize2.x;
        maxSize1.y = Math.min(maxSize1.y, maxSize2.y);
      } else {
        maxSize1.y += maxSize2.y;
        maxSize1.x = Math.min(maxSize1.x, maxSize2.x);
      }
      return maxSize1;
      return {
        x: Math.min(maxSize1.x, maxSize2.x),
        y: Math.min(maxSize1.y, maxSize2.y),
      };
    } else if (maxSize1) {
      return maxSize1;
    } else if (maxSize2) {
      return maxSize2;
    }

    return false;
  },

  // Get, or Set a splitter position.
  // Params:
  //    value         If supplied, assigns a new splitter percentage (0-1).
  // Returns:
  //    number        The current position.
  pos: function(value) {
    if (typeof value === 'undefined') {
      return this._pos;
    }
    this._pos = value;
    this.__update();

    if (this._parent instanceof wcPanel) {
      this._parent.__trigger(wcDocker.EVENT_UPDATED);
    }

    return this._pos;
  },

  // Sets, or Gets the widget at a given pane
  // Params:
  //    index       The pane index, only 0 or 1 are valid.
  //    item        If supplied, assigns the item to the pane.
  // Returns:
  //    wcPanel     The panel that exists in the pane.
  //    wcSplitter  
  //    false       If no pane exists.
  pane: function(index, item) {
    if (index >= 0 && index < 2) {
      if (typeof item === 'undefined') {
        return this._pane[index];
      } else {
        if (item) {
          this._pane[index] = item;
          item._parent = this;
          item.__container(this.$pane[index]);

          if (this._pane[0] && this._pane[1]) {
            this.__update();
          }
          return item;
        } else if (this._pane[index]) {
          this._pane[index].__container(null);
          this._pane[index] = false;
        }
      }
    }
    this.__update();
    return false;
  },

  // Toggles whether a pane can contain scroll bars.
  // By default, scrolling is enabled.
  // Params:
  //    index     The pane index, only 0 or 1 are valid.
  //    x         Whether to allow scrolling in the horizontal direction.
  //    y         Whether to allow scrolling in the vertical direction.
  scrollable: function(index, x, y) {
    if (typeof x !== 'undefined') {
      this.$pane[index].toggleClass('wcScrollableX', x);
    }
    if (typeof y !== 'undefined') {
      this.$pane[index].toggleClass('wcScrollableY', y);
    }

    return {
      x: this.$pane[index].hasClass('wcScrollableX'),
      y: this.$pane[index].hasClass('wcScrollableY'),
    };
  },

  // Destroys the splitter.
  // Params:
  //    destroyPanes    If true, or omitted, both panes attached will be destroyed as well.
  destroy: function(destroyPanes) {
    var docker = this.docker();
    if (docker) {
      var index = this.docker()._splitterList.indexOf(this);
      if (index > -1) {
        this.docker()._splitterList.splice(index, 1);
      }
    }

    if (typeof destroyPanes === 'undefined' || destroyPanes) {
      this.__destroy();
    } else {
      this.__container(null);
    }
  },

  // Reaction to the panels update event.
  onUpdate: function() {
    this.__update();
  },

  // Reaction to the panels close event.
  onClosed: function() {
    this.destroy();
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$pane.push($('<div class="wcLayoutPane wcScrollableX wcScrollableY">'));
    this.$pane.push($('<div class="wcLayoutPane wcScrollableX wcScrollableY">'));
    this.$bar = $('<div class="wcSplitterBar">');

    if (this._orientation) {
      this.$pane[0].addClass('wcTall');
      this.$pane[1].addClass('wcTall');
      this.$bar.addClass('wcTall').addClass('wcSplitterBarV');
    } else {
      this.$pane[0].addClass('wcWide');
      this.$pane[1].addClass('wcWide');
      this.$bar.addClass('wcWide').addClass('wcSplitterBarH');
    }

    this.__container(this.$container);

    if (this._parent instanceof wcPanel) {
      this._boundEvents.push({event: wcDocker.EVENT_UPDATED, handler: this.onUpdate.bind(this)});
      this._boundEvents.push({event: wcDocker.EVENT_CLOSED,  handler: this.onClosed.bind(this)});

      for (var i = 0; i < this._boundEvents.length; ++i) {
        this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
      }
    }
  },

  // Updates the size of the splitter.
  __update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var minSize = this.__minPos();
    var maxSize = this.__maxPos();

    if (this._findBestPos) {
      this._findBestPos = false;

      var size1;
      var size2;
      if (this._pane[0] && typeof this._pane[0].initSize === 'function') {
        size1 = this._pane[0].initSize();
        if (size1) {
          if (size1.x < 0) {
            size1.x = width/2;
          }
          if (size1.y < 0) {
            size1.y = height/2;
          }
        }
      }

      if (this._pane[1] && typeof this._pane[1].initSize === 'function') {
        size2 = this._pane[1].initSize();
        if (size2) {
          if (size2.x < 0) {
            size2.x = width/2;
          }
          if (size2.y < 0) {
            size2.y = height/2;
          }

          size2.x = width  - size2.x;
          size2.y = height - size2.y;
        }
      }

      var size;
      if (size1 && size2) {
        size = {
          x: Math.min(size1.x, size2.x),
          y: Math.min(size1.y, size2.y),
        };
      } else if (size1) {
        size = size1;
      } else if (size2) {
        size = size2;
      }

      if (size) {
        if (this._orientation) {
          this._pos = size.x / width;
        } else {
          this._pos = size.y / height;
        }
      }
    }

    if (this._orientation) {
      var size = width * this._pos;

      if (minSize) {
        size = Math.max(minSize.x, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.x, size);
      }

      // Bar is top to bottom

      this.$bar.css('left', size+2);
      this.$bar.css('top', '0px');
      this.$bar.css('height', height-2);
      this.$pane[0].css('width', size+2);
      this.$pane[0].css('left',  '0px');
      this.$pane[0].css('right', '');
      this.$pane[1].css('left',  '');
      this.$pane[1].css('right', '0px');
      this.$pane[1].css('width', width - size - 6);
    } else {
      var size = height * this._pos;

      if (minSize) {
        size = Math.max(minSize.y, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.y, size);
      }

      // Bar is left to right

      this.$bar.css('top', size+2);
      this.$bar.css('left', '0px');
      this.$bar.css('width', width-2);
      this.$pane[0].css('height', size+2);
      this.$pane[0].css('top',    '0px');
      this.$pane[0].css('bottom', '');
      this.$pane[1].css('top',    '');
      this.$pane[1].css('bottom', '0px');
      this.$pane[1].css('height', height - size - 6);
    }

    if (this._pane[0]) {
      this._pane[0].__update();
    }
    if (this._pane[1]) {
      this._pane[1].__update();
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type       = 'wcSplitter';
    data.horizontal = this._orientation;
    data.pane0      = this._pane[0]? this._pane[0].__save(): null;
    data.pane1      = this._pane[1]? this._pane[1].__save(): null;
    data.pos        = this._pos;
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._pos  = data.pos;
    if (data.pane0) {
      this._pane[0] = docker.__create(data.pane0, this, this.$pane[0]);
      this._pane[0].__restore(data.pane0, docker);
    }
    if (data.pane1) {
      this._pane[1] = docker.__create(data.pane1, this, this.$pane[1]);
      this._pane[1].__restore(data.pane1, docker);
    }
  },

  // Attempts to find the best splitter position based on
  // the contents of each pane.
  __findBestPos: function() {
    this._findBestPos = true;
  },

  // Moves the slider bar based on a mouse position.
  // Params:
  //    mouse       The mouse offset position.
  __moveBar: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.__minPos();
    var maxSize = this.__maxPos();

    if (this._orientation) {
      this.pos((mouse.x-3) / width);
    } else {
      this.pos((mouse.y-3) / height);
    }
  },

  // Gets the minimum position of the splitter divider.
  __minPos: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var minSize;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize = this._pane[0].minSize();
    } else {
      minSize = {x:50,y:50};
    }

    var maxSize;
    if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
      maxSize = this._pane[1].maxSize();
    } else {
      maxSize = {x:width,y:height};
    }

    maxSize.x = width  - Math.min(maxSize.x, width);
    maxSize.y = height - Math.min(maxSize.y, height);

    minSize.x = Math.max(minSize.x, maxSize.x);
    minSize.y = Math.max(minSize.y, maxSize.y);
    return minSize;
  },

  // Gets the maximum position of the splitter divider.
  __maxPos: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var maxSize;
    if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
      maxSize = this._pane[0].maxSize();
    } else {
      maxSize = {x:width,y:height};
    }

    var minSize;
    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      minSize = this._pane[1].minSize();
    } else {
      minSize = {x:50,y:50};
    }

    minSize.x = width  - minSize.x;
    minSize.y = height - minSize.y;

    maxSize.x = Math.min(minSize.x, maxSize.x);
    maxSize.y = Math.min(minSize.y, maxSize.y);
    return maxSize;
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
      this.$container.append(this.$pane[0]);
      this.$container.append(this.$pane[1]);
      this.$container.append(this.$bar);
    } else {
      this.$pane[0].remove();
      this.$pane[1].remove();
      this.$bar.remove();
    }
    return this.$container;
  },

  // Removes a child from this splitter.
  // Params:
  //    child         The child to remove.
  __removeChild: function(child) {
    if (this._pane[0] === child) {
      this._pane[0] = false;
    } else if (this._pane[1] === child) {
      this._pane[1] = false;
    } else {
      return;
    }
 
    if (child) {
      child.__container(null);
      child._parent = null;
    }
  },

  // Disconnects and prepares this widget for destruction.
  __destroy: function() {
    // Remove all registered events.
    while (this._boundEvents.length){
      this._parent.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.pop();
    }

    if (this._pane[0]) {
      this._pane[0].__destroy();
      this._pane[0] = null;
    }
    if (this._pane[1]) {
      this._pane[1].__destroy();
      this._pane[1] = null;
    }

    this.__container(null);
    this._parent = false;
  },
};
/*
  A tab widget container, to break up multiple elements into separate tabs.
*/
function wcTabFrame(container, parent) {
  this.$container = $(container);
  this._parent = parent;

  this.$frame     = null;
  this.$title     = null;
  this.$tabScroll = null;
  this.$center    = null;
  this.$tabLeft   = null;
  this.$tabRight  = null;
  this.$close     = null;

  this._canScrollTabs = false;
  this._tabScrollPos = 0;
  this._curTab = -1;
  this._layoutList = [];
  this._moveable = true;

  this._boundEvents = [];

  this.__init();
};

wcTabFrame.prototype = {
  LEFT_TAB_BUFFER: 15,

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

  // Destroys the tab area.
  destroy: function() {
    this.__destroy();
  },

  // Adds a new tab item at a given index
  // Params:
  //    name      The name of the tab.
  //    index     An optional index to insert the tab at.
  // Returns:
  //    wcLayout  The layout of the newly created tab.
  addTab: function(name, index) {
    var newLayout = new wcLayout('.wcDockerTransition', this._parent);
    newLayout.name = name;
    newLayout._scrollable = {
      x: true,
      y: true,
    };
    newLayout._scroll = {
      x: 0,
      y: 0,
    };
    newLayout._closeable = false;
    newLayout._overflowVisible = false;

    if (typeof index === 'undefined') {
      this._layoutList.push(newLayout);
    } else {
      this._layoutList.splice(index, 0, newLayout);
    }

    if (this._curTab === -1 && this._layoutList.length) {
      this._curTab = 0;
    }

    this.__updateTabs();

    return newLayout;
  },

  // Removes a tab item.
  // Params:
  //    index       The tab index to remove.
  // Returns:
  //    bool        Returns whether or not the tab was removed.
  removeTab: function(index) {
    if (index > -1 && index < this._layoutList.length) {
      var name = this._layoutList[index].name;
      this._layoutList[index].__destroy();
      this._layoutList.splice(index, 1);

      if (this._curTab >= index) {
        this._curTab--;

        if (this._curTab < 0) {
          this._curTab = 0;
        }
      }

      this.__updateTabs();
      this._parent.__trigger(wcDocker.EVENT_CUSTOM_TAB_CLOSED, {obj: this, name: name, index: index});
      return true;
    }
    return false;
  },

  // Gets, or Sets the currently visible tab.
  // Params:
  //    index     If supplied, sets the current tab index.
  // Returns:
  //    number    The currently visible tab index.
  tab: function(index, autoFocus) {
    if (typeof index !== 'undefined') {
      if (index > -1 && index < this._layoutList.length) {
        this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        this._curTab = index;
        this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + index + '"]').addClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + index + '"]').removeClass('wcPanelTabContentHidden');
        this.__updateTabs(autoFocus);

        var name = this._layoutList[this._curTab].name;
        this._parent.__trigger(wcDocker.EVENT_CUSTOM_TAB_CHANGED, {obj: this, name: name, index: index});
      }
    }

    return this._curTab;
  },

  // Retrieves the layout for a given tab.
  // Params:
  //    index     The tab index.
  // Returns:
  //    wcLayout  The layout found.
  //    false     The layout was not found.
  layout: function(index) {
    if (index > -1 && index < this._layoutList.length) {
      return this._layoutList[index];
    }
    return false;
  },

  // Moves a tab from a given index to another index.
  // Params:
  //    fromIndex     The current tab index to move.
  //    toIndex       The new index to move to.
  // Returns:
  //    element       The new element of the moved tab.
  //    false         If an error occurred.
  moveTab: function(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this._layoutList.length &&
        toIndex >= 0 && toIndex < this._layoutList.length) {
      var panel = this._layoutList.splice(fromIndex, 1);
      this._layoutList.splice(toIndex, 0, panel[0]);

      // Preserve the currently active tab.
      if (this._curTab === fromIndex) {
        this._curTab = toIndex;
      }

      this.__updateTabs();

      return this.$title.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
    }
    return false;
  },

  // Gets, or Sets whether the tabs can be reordered by the user.
  // Params:
  //    moveable  If supplied, assigns whether tabs are moveable.
  // Returns:
  //    boolean   Whether tabs are currently moveable.
  moveable: function(moveable) {
    if (typeof moveable !== 'undefined') {
      this._moveable = moveable;
    }
    return this._moveable;
  },

  // Gets, or Sets whether a tab can be closed (removed) by the user.
  // Params:
  //    index     The index of the tab.
  //    closeable If supplied, assigns whether the tab can be closed.
  // Returns:
  //    boolean   Whether the tab can be closed.
  closeable: function(index, closeable) {
    if (index > -1 && index < this._layoutList.length) {
      var layout = this._layoutList[index];

      if (typeof closeable !== 'undefined') {
        layout._closeable = closeable;
      }

      return layout._closeable;
    }
    return false;
  },

  // Gets, or Sets whether a tab area is scrollable.
  // Params:
  //    index     The index of the tab.
  //    x, y      If supplied, assigns whether the tab pane
  //              is scrollable for each axis.
  // Returns:
  //    Object    An object with boolean values x and y
  //              that tell whether each axis is scrollable.
  scrollable: function(index, x, y) {
    if (index > -1 && index < this._layoutList.length) {
      var layout = this._layoutList[index];

      var changed = false;
      if (typeof x !== 'undefined') {
        layout._scrollable.x = x;
        changed = true;
      }
      if (typeof y !== 'undefined') {
        layout._scrollable.y = y;
        changed = true;
      }

      if (changed) {
        this.__onTabChange();
      }

      return {
        x: layout._scrollable.x,
        y: layout._scrollable.y,
      };
    }
    return false;
  },

  // Gets, or Sets whether overflow on a tab area is visible.
  // Params:
  //    index     The index of the tab.
  //    visible   If supplied, assigns whether overflow is visible.
  //
  // Returns:
  //    boolean   The current overflow visibility.
  overflowVisible: function(index, visible) {
    if (index > -1 && index < this._layoutList.length) {
      var layout = this._layoutList[index];

      if (typeof overflow !== 'undefined') {
        layout._overflowVisible = overflow;
        this.__onTabChange();
      }
      return layout._overflowVisible;
    }
    return false;
  },

  // Sets the icon for a tab.
  // Params:
  //    index     The index of the tab to alter.
  //    icon      A CSS class name that represents the icon.
  icon: function(index, icon) {
    if (index > -1 && index < this._layoutList.length) {
      var layout = this._layoutList[index];

      if (!layout.$icon) {
        layout.$icon = $('<div>');
      }

      layout.$icon.removeClass();
      layout.$icon.addClass('wcTabIcon ' + icon);
    }
  },

  // Sets the icon for a tab.
  // Params:
  //    index     The index of the tab to alter.
  //    icon      A font-awesome icon name (without the 'fa fa-' prefix).
  faicon: function(index, icon) {
    if (index > -1 && index < this._layoutList.length) {
      var layout = this._layoutList[index];

      if (!layout.$icon) {
        layout.$icon = $('<div>');
      }

      layout.$icon.removeClass();
      layout.$icon.addClass('fa fa-fw fa-' + icon);
    }
  },

  // Reaction to the panels update event.
  onUpdate: function() {
    this.__update();
  },

  // Reaction to the panels close event.
  onClosed: function() {
    this.destroy();
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$frame     = $('<div class="wcCustomTab wcWide wcTall wcPanelBackground">');
    this.$title     = $('<div class="wcFrameTitle wcCustomTabTitle">');
    this.$tabScroll = $('<div class="wcTabScroller">');
    this.$center    = $('<div class="wcFrameCenter wcWide">');
    this.$tabLeft   = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
    this.$tabRight  = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
    this.$close     = $('<div class="wcFrameButton" title="Close the currently active panel tab"><span class="fa fa-close"></span>X</div>');
    this.$frame.append(this.$title);
    this.$title.append(this.$tabScroll);
    this.$frame.append(this.$center);

    this.__container(this.$container);

    this._boundEvents.push({event: wcDocker.EVENT_UPDATED, handler: this.onUpdate.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_CLOSED,  handler: this.onClosed.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }

    var docker = this.docker();
    if (docker) {
      docker._tabList.push(this);
    }
  },

  // Updates the size of the frame.
  __update: function() {
    this.__updateTabs();
  },

  __updateTabs: function(autoFocus) {
    this.$tabScroll.empty();

    var tabPositions = [];
    var totalWidth = 0;
    var parentLeft = this.$tabScroll.offset().left;
    var self = this;

    this.$center.children('.wcPanelTabContent').each(function() {
      $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
    });

    for (var i = 0; i < this._layoutList.length; ++i) {
      var $tab = $('<div id="' + i + '" class="wcPanelTab">' + this._layoutList[i].name + '</div>');
      if (this._moveable) {
        $tab.addClass('wcCustomTabMoveable');
      }
      this.$tabScroll.append($tab);
      if (this._layoutList[i].$icon) {
        $tab.prepend(this._layoutList[i].$icon);
      }

      var $tabContent = this.$center.children('.wcPanelTabContent[id="' + i + '"]');
      if (!$tabContent.length) {
        $tabContent = $('<div class="wcPanelTabContent wcPanelTabContentHidden" id="' + i + '">');
        this.$center.append($tabContent);
      }

      this._layoutList[i].__container($tabContent);
      this._layoutList[i]._parent = this;

      var isVisible = this._curTab === i;

      $tabContent.removeClass('wcPanelTabUnused');

      if (isVisible) {
        $tab.addClass('wcPanelTabActive');
        $tabContent.removeClass('wcPanelTabContentHidden');
      }

      totalWidth = $tab.offset().left - parentLeft;
      tabPositions.push(totalWidth);

      totalWidth += $tab.outerWidth();
    }

    // Now remove all unused panel tabs.
    this.$center.children('.wcPanelTabUnused').each(function() {
      $(this).remove();
    });

    // $tempCenter.remove();
    var buttonSize = this.__onTabChange();

    if (autoFocus) {
      for (var i = 0; i < tabPositions.length; ++i) {
        if (i === this._curTab) {
          var left = tabPositions[i];
          var right = totalWidth;
          if (i+1 < tabPositions.length) {
            right = tabPositions[i+1];
          }

          var scrollPos = -parseInt(this.$tabScroll.css('left'));
          var titleWidth = this.$title.width() - buttonSize;

          // If the tab is behind the current scroll position.
          if (left < scrollPos) {
            this._tabScrollPos = left - this.LEFT_TAB_BUFFER;
            if (this._tabScrollPos < 0) {
              this._tabScrollPos = 0;
            }
          }
          // If the tab is beyond the current scroll position.
          else if (right - scrollPos > titleWidth) {
            this._tabScrollPos = right - titleWidth + this.LEFT_TAB_BUFFER;
          }
          break;
        }
      }
    }

    this._canScrollTabs = false;
    if (totalWidth > this.$title.width() - buttonSize) {
      this._canScrollTabs = true;
      this.$frame.append(this.$tabRight);
      this.$frame.append(this.$tabLeft);
      var scrollLimit = totalWidth - (this.$title.width() - buttonSize)/2;
      // If we are beyond our scroll limit, clamp it.
      if (this._tabScrollPos > scrollLimit) {
        var children = this.$tabScroll.children();
        for (var i = 0; i < children.length; ++i) {
          var $tab = $(children[i]);

          totalWidth = $tab.offset().left - parentLeft;
          if (totalWidth + $tab.outerWidth() > scrollLimit) {
            this._tabScrollPos = totalWidth - this.LEFT_TAB_BUFFER;
            if (this._tabScrollPos < 0) {
              this._tabScrollPos = 0;
            }
            break;
          }
        }
      }
    } else {
      this._tabScrollPos = 0;
      this.$tabLeft.remove();
      this.$tabRight.remove();
    }

    this.$tabScroll.stop().animate({left: -this._tabScrollPos + 'px'}, 'fast');
  },

  __onTabChange: function() {
    var buttonSize = 0;
    var layout = this.layout(this._curTab);
    if (layout) {
      this.$center.toggleClass('wcScrollableX', layout._scrollable.x);
      this.$center.toggleClass('wcScrollableY', layout._scrollable.y);
      this.$center.toggleClass('wcOverflowVisible', layout._overflowVisible);

      this.$tabLeft.remove();
      this.$tabRight.remove();

      if (layout._closeable) {
        this.$frame.append(this.$close);
        buttonSize += this.$close.outerWidth();
      } else {
        this.$close.remove();
      }

      if (this._canScrollTabs) {
        this.$frame.append(this.$tabRight);
        this.$frame.append(this.$tabLeft);

        buttonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
      }

      this.$center.scrollLeft(layout._scroll.x);
      this.$center.scrollTop(layout._scroll.y);
    }
    return buttonSize;
  },

  // Handles scroll notifications.
  __scrolled: function() {
    var layout = this.layout(this._curTab);
    layout._scroll.x = this.$center.scrollLeft();
    layout._scroll.y = this.$center.scrollTop();
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
      this.$container.append(this.$frame);
    } else {
      this.$frame.remove();
    }
    return this.$container;
  },

  // Disconnects and prepares this widget for destruction.
  __destroy: function() {
    var docker = this.docker();
    if (docker) {
      var index = docker._tabList.indexOf(this);
      if (index > -1) {
        docker._tabList.splice(index, 1);
      }
    }

    // Remove all registered events.
    while (this._boundEvents.length){
      this._parent.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.pop();
    }

    this._curTab = -1;
    for (var i = 0; i < this._layoutList.length; ++i) {
      this._layoutList[i].__destroy();
    }

    while (this._layoutList.length) this._layoutList.pop();
    this.__container(null);
    this._parent = null;
  },
};
function wcIFrame(container, panel) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$container = $(container);
  this.$frame = null;

  this._window = null;
  this._isAttached = true;
  this._hasFocus = false;

  this._boundEvents = [];

  this.__init();
};

wcIFrame.prototype = {
  // --------------------------------------------------------------------------------
  docker: function() {
    var parent = this._panel;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  // --------------------------------------------------------------------------------
  openURL: function(url) {
    this.__clearFrame();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.__updateFrame();
    this._window.location.replace(url);
  },

  // --------------------------------------------------------------------------------
  openHTML: function(html) {
    this.__clearFrame();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.__updateFrame();

    this._boundEvents = [];

    // Write the frame source.
    this._window.document.open();
    this._window.document.write(html);
    this._window.document.close();
  },

  // --------------------------------------------------------------------------------
  show: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  hide: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  window: function() {
    return this._window;
  },

  // --------------------------------------------------------------------------------
  destroy: function() {
    // Remove all registered events.
    while (this._boundEvents.length){
      this._panel.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.pop();
    }

    this.__clearFrame();
    this._panel = null;
    this._layout = null;
    this.$container = null;
  },

  // ---------------------------------------------------------------------------
  onVisibilityChanged: function() {
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onBeginDock: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onEndDock: function() {
    if (this.$frame && this._hasFocus) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveStarted: function() {
    if (this.$frame) {
      // Hide the frame while it is moving.
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveFinished: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // --------------------------------------------------------------------------------
  onMoved: function() {
    if (this.$frame) {
      // Size, position, and show the frame once the move is finished.
      var pos = this.$container.offset();
      var width = this.$container.width();
      var height = this.$container.height();

      this.$frame.css('left', pos.left);
      this.$frame.css('top', pos.top);
      this.$frame.css('width', width);
      this.$frame.css('height', height);
    }
  },

  // ---------------------------------------------------------------------------
  onAttached: function() {
    this._isAttached = true;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onDetached: function() {
    this._isAttached = false;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onGainFocus: function() {
    this._hasFocus = true;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onLostFocus: function() {
    this._hasFocus = false;
    this.__updateFrame();
  },

  // --------------------------------------------------------------------------------
  onClosed: function() {
    this.destroy();
  },

  // --------------------------------------------------------------------------------
  __clearFrame: function() {
    if (this.$frame) {
      this.$frame[0].srcdoc = '';
      this.$frame.remove();
      this.$frame = null;
      this._window = null;
    }
  },

  // --------------------------------------------------------------------------------
  __updateFrame: function() {
    if (this.$frame) {
      this.$frame.toggleClass('wcIFrameFloating', !this._isAttached);
      if (!this._isAttached) {
        this.$frame.toggleClass('wcIFrameFloatingFocus', this._hasFocus);
      } else {
        this.$frame.removeClass('wcIFrameFloatingFocus');
      }
      this.$frame.toggleClass('wcIFramePanelHidden', !this._panel.isVisible());
    }
  },

  // --------------------------------------------------------------------------------
  __init: function() {
    this._boundEvents.push({event: wcDocker.EVENT_VISIBILITY_CHANGED, handler: this.onVisibilityChanged.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_BEGIN_DOCK,         handler: this.onBeginDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_END_DOCK,           handler: this.onEndDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVE_STARTED,       handler: this.onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZE_STARTED,     handler: this.onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVE_ENDED,         handler: this.onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZE_ENDED,       handler: this.onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVED,              handler: this.onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZED,            handler: this.onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_ATTACHED,           handler: this.onAttached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_DETACHED,           handler: this.onDetached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_GAIN_FOCUS,         handler: this.onGainFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_LOST_FOCUS,         handler: this.onLostFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_CLOSED,             handler: this.onClosed.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._panel.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }
  },
};
