/*!
 * Web Cabin Docker - Docking Layout Interface.
 *
 * Dependencies:
 *  JQuery 1.11.1
 *  JQuery-contextMenu 1.6.6
 *  font-awesome 4.2.0
 *
 * Author: Jeff Houde (lochemage@webcabin.org)
 * Web: https://docker.webcabin.org/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */

/**
 * @class
 * The main docker instance.  This manages all of the docking panels and user input.
 * There should only be one instance of this, although it is not enforced.<br>
 * See {@tutorial getting-started}
 *
 * @constructor
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element to store the contents of wcDocker.
 * @param {wcDocker~Options} [options] - Options for constructing the instance.
 */
function wcDocker(container, options) {
  this.$outer = $(container);
  this.$container = $('<div class="wcDocker">');
  this.$transition = $('<div class="wcDockerTransition">');
  this.$loading = null;

  this.$outer.append(this.$container);
  this.$container.append(this.$transition);

  this._canOrientTabs = true;

  this._events = {};

  this._root = null;
  this._frameList = [];
  this._floatingList = [];
  this._modalList = [];
  this._focusFrame = null;
  this._placeholderPanel = null;
  this._contextTimer = 0;
  this._dirty = false;

  this._splitterList = [];
  this._tabList = [];
  this._collapser = {};

  this._dockPanelTypeList = [];

  this._creatingPanel = false;
  this._draggingSplitter = null;
  this._draggingFrame = null;
  this._draggingFrameSizer = null;
  this._draggingFrameTab = null;
  this._draggingFrameTopper = false;
  this._draggingCustomTabFrame = null;
  this._ghost = null;
  this._menuTimer = 0;
  this._mouseOrigin = {x: 0, y: 0};

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  var defaultOptions = {
    themePath: 'Themes',
    theme: 'default',
    loadingClass: 'fa fa-spinner fa-pulse',
    allowContextMenu: true,
    hideOnResize: false,
    allowCollapse: true,
    responseRate: 10
  };

  this._options = {};
  for (var prop in defaultOptions) {
    this._options[prop] = defaultOptions[prop];
  }
  for (var prop in options) {
    this._options[prop] = options[prop];
  }

  this.__init();
};

/**
 * Enumerated Docking positions.
 * @version 3.0.0
 * @enum {String}
 */
wcDocker.DOCK = {
  /** A floating panel that blocks input until closed */
  MODAL                 : 'modal',
  /** A floating panel */
  FLOAT                 : 'float',
  /** Docks to the top of a target or window */
  TOP                   : 'top',
  /** Docks to the left of a target or window */
  LEFT                  : 'left',
  /** Docks to the right of a target or window */
  RIGHT                 : 'right',
  /** Docks to the bottom of a target or window */
  BOTTOM                : 'bottom',
  /** Docks as another tabbed item along with the target */
  STACKED               : 'stacked'
};

/**
 * Enumerated Internal events
 * @version 3.0.0
 * @enum {String}
 */
wcDocker.EVENT = {
  /** When the panel is initialized */
  INIT                 : 'panelInit',
  /** When all panels have finished loading */
  LOADED               : 'dockerLoaded',
  /** When the panel is updated */
  UPDATED              : 'panelUpdated',
  /**
   * When the panel has changed its visibility<br>
   * This event is called with the current visibility state as the first parameter.
   */
  VISIBILITY_CHANGED   : 'panelVisibilityChanged',
  /** When the user begins moving any panel from its current docked position */
  BEGIN_DOCK           : 'panelBeginDock',
  /** When the user finishes moving or docking a panel */
  END_DOCK             : 'panelEndDock',
  /** When the user brings any panel within a tabbed frame into focus */
  GAIN_FOCUS           : 'panelGainFocus',
  /** When the user leaves focus on any panel within a tabbed frame */
  LOST_FOCUS           : 'panelLostFocus',
  /** When the panel is being closed */
  CLOSED               : 'panelClosed',
  /** When a custom button is clicked, See [wcPanel.addButton]{@link wcPanel#addButton} */
  BUTTON               : 'panelButton',
  /** When the panel has moved from floating to a docked position */
  ATTACHED             : 'panelAttached',
  /** When the panel has moved from a docked position to floating */
  DETACHED             : 'panelDetached',
  /**
   * When the user has started moving the panel (top-left coordinates changed)<br>
   * This event is called with an object of the current {x, y} position as the first parameter.
   */
  MOVE_STARTED         : 'panelMoveStarted',
  /**
   * When the user has finished moving the panel<br>
   * This event is called with an object of the current {x, y} position as the first parameter.
   */
  MOVE_ENDED           : 'panelMoveEnded',
  /**
   * When the top-left coordinates of the panel has changed<br>
   * This event is called with an object of the current {x, y} position as the first parameter.
   */
  MOVED                : 'panelMoved',
  /**
   * When the user has started resizing the panel (width or height changed)<br>
   * This event is called with an object of the current {width, height} size as the first parameter.
   */
  RESIZE_STARTED       : 'panelResizeStarted',
  /**
   * When the user has finished resizing the panel<br>
   * This event is called with an object of the current {width, height} size as the first parameter.
   */
  RESIZE_ENDED         : 'panelResizeEnded',
  /**
   * When the panels width or height has changed<br>
   * This event is called with an object of the current {width, height} size as the first parameter.
   */
  RESIZED              : 'panelResized',
  /** When the contents of the panel has been scrolled */
  SCROLLED             : 'panelScrolled',
  /** When the layout is being saved, See [wcDocker.save]{@link wcDocker#save} */
  SAVE_LAYOUT          : 'layoutSave',
  /** When the layout is being restored, See [wcDocker.restore]{@link wcDocker#restore} */
  RESTORE_LAYOUT       : 'layoutRestore',
  /** When the current tab on a custom tab widget associated with this panel has changed, See {@link wcTabFrame} */
  CUSTOM_TAB_CHANGED   : 'customTabChanged',
  /** When a tab has been closed on a custom tab widget associated with this panel, See {@link wcTabFrame} */
  CUSTOM_TAB_CLOSED    : 'customTabClosed'
};

/**
 * The name of the placeholder panel.
 * @constant {String}
 */
wcDocker.PANEL_PLACEHOLDER = '__wcDockerPlaceholderPanel';

/**
 * Used when [adding]{@link wcDocker#addPanel} or [moving]{@link wcDocker#movePanel} a panel to designate the target location as collapsed.<br>
 * Must be used with [docking]{@link wcDocker.DOCK} positions LEFT, RIGHT, or BOTTOM only.
 * @constant {String}
 */
wcDocker.COLLAPSED = '__wcDockerCollapsedPanel';

/**
 * Used for the splitter bar orientation.
 * @version 3.0.0
 * @enum {Boolean}
 */
wcDocker.ORIENTATION = {
  /** Top and Bottom panes */
  VERTICAL       : false,
  /** Left and Right panes */
  HORIZONTAL     : true
};

/**
 * Used to determine the position of tabbed widgets for stacked panels.<br>
 * <b>Note:</b> Not supported on IE8 or below.
 * @version 3.0.0
 * @enum {String}
 */
wcDocker.TAB = {
  /** The default, puts tabs at the top of the frame */
  TOP     : 'top',
  /** Puts tabs on the left side of the frame */
  LEFT    : 'left',
  /** Puts tabs on the right side of the frame */
  RIGHT   : 'right',
  /** Puts tabs on the bottom of the frame */
  BOTTOM  : 'bottom'
}

wcDocker.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets, or Sets the path where all theme files can be found.
   * "Themes" is the default folder path.
   * @param {String} path - If supplied, will set the path where all themes can be found.
   * @returns {String} - The currently assigned path.
   */
  themePath: function(path) {
    if (path !== undefined) {
      this._options.themePath = path;
    }
    return this._options.themePath;
  },

  /**
   * Gets, or Sets the current theme used by docker.
   * @param {String} themeName - If supplied, will activate a theme with the given name.
   * @returns {String} - The currently active theme.
   */
  theme: function(themeName) {
    if (themeName !== undefined) {
      var $oldTheme = $('#wcTheme');

      // The default theme requires no additional theme css file.
      var cacheBreak = (new Date()).getTime();
      var ext = themeName.indexOf('.css');
      if (ext > -1) {
        themeName = themeName.substring(0, ext);
      }
      var $link = $('<link id="wcTheme" rel="stylesheet" type="text/css" href="' + this._options.themePath + '/' + themeName + '.css?v=' + cacheBreak + '"/>');
      this._options.theme = themeName;

      var self = this;
      $link[0].onload = function() {
        $oldTheme.remove();
        self.__update();
      }

      $('head').append($link);
    }

    return this._options.theme;
  },

  /**
   * Retrieves whether panel collapsers are enabled.
   * @version 3.0.0
   * @returns {Boolean} - Collapsers are enabled.
   */
  isCollapseEnabled: function() {
    return (this._canOrientTabs && this._options.allowCollapse);
  },

  /**
   * Registers a new docking panel type to be used later.
   * @version 3.0.0
   * @param {String} name                       - The name identifier for the new panel type.
   * @param {wcDocker~registerOptions} options  - An options object for describing the panel type.
   * @param {Boolean} [isPrivate]               - <b>DEPRECATED:</b> Use [options]{@link wcDocker~registerOptions} instead.
   * @returns {Boolean} - Success or failure. Failure usually indicates the type name already exists.
   */
  registerPanelType: function(name, optionsOrCreateFunc, isPrivate) {

    var options = optionsOrCreateFunc;
    if (typeof options === 'function') {
      options = {
        onCreate: optionsOrCreateFunc,
      };
      console.log("WARNING: Passing in the creation function directly to wcDocker.registerPanelType parameter 2 is now deprecated and will be removed in the next version!  Please use the preferred options object instead.");
    }

    if (typeof isPrivate != 'undefined') {
      options.isPrivate = isPrivate;
      console.log("WARNING: Passing in the isPrivate flag to wcDocker.registerPanelType parameter 3 is now deprecated and will be removed in the next version!  Please use the preferred options object instead.");
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

  /**
   * Retrieves a list of all currently registered panel types.
   * @param {Boolean} includePrivate - If true, panels registered as private will also be included with this list.
   * @returns {String[]} - A list of panel type names.
   */
  panelTypes: function(includePrivate) {
    var result = [];
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (includePrivate || !this._dockPanelTypeList[i].options.isPrivate) {
        result.push(this._dockPanelTypeList[i].name);
      }
    }
    return result;
  },

  /**
   * Retrieves the options data associated with a given panel type when it was registered.
   * @param {String} typeName - The name identifier of the panel.
   * @returns {wcDocker~registerOptions} - Registered options of the panel type, or false if the panel was not found.
   */
  panelTypeInfo: function(typeName) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name == typeName) {
        return this._dockPanelTypeList[i].options;
      }
    }
    return false;
  },

  /**
   * Add a new docked panel to the docker instance.<br>
   * <b>Note:</b> It is best to use {@link wcDocker.COLLAPSED} after you have added your other docked panels, as it may ensure proper placement.
   * @param {String} typeName                           - The name identifier of the panel to create.
   * @param {wcDocker.DOCK} location                    - The docking location to place this panel.
   * @param {wcPanel|wcDocker.COLLAPSED} [targetPanel]  - A target panel to dock relative to, or use {@link wcDocker.COLLAPSED} to collapse it to the side or bottom.
   * @param {wcDocker~PanelOptions} [options]           - Other options for panel placement.
   * @returns {wcPanel|Boolean} - The newly created panel object, or false if no panel was created.
   */
  addPanel: function(typeName, location, targetPanel, options) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === typeName) {
        var panelType = this._dockPanelTypeList[i];
        var panel = new wcPanel(typeName, panelType.options);
        panel._parent = this;
        panel.__container(this.$transition);
        var panelOptions = (panelType.options && panelType.options.options) || {};
        panel._panelObject = new panelType.options.onCreate(panel, panelOptions);

        if (location === wcDocker.DOCK.STACKED) {
          this.__addPanelGrouped(panel, targetPanel, options);
        } else {
          this.__addPanelAlone(panel, location, targetPanel, options);
        }

        if (this._placeholderPanel && panel.moveable() &&
            location !== wcDocker.DOCK.FLOAT &&
            location !== wcDocker.DOCK.MODAL) {
          if (this.removePanel(this._placeholderPanel)) {
            this._placeholderPanel = null;
          }
        }

        this.__forceUpdate();
        return panel;
      }
    }
    return false;
  },

  /**
   * Removes a docked panel from the window.
   * @param {wcPanel} panel - The panel to remove.
   * @returns {Boolean} - Success or failure.
   */
  removePanel: function(panel) {
    if (!panel) {
      return false;
    }

    // Do not remove if this is the last moveable panel.
    var lastPanel = this.__isLastPanel(panel);

    var parentFrame = panel._parent;
    if (parentFrame instanceof wcFrame) {
      panel.__trigger(wcDocker.EVENT.CLOSED);

      // If no more panels remain in this frame, remove the frame.
      if (!parentFrame.removePanel(panel) && !parentFrame.isCollapser()) {
        // If this is the last frame, create a dummy panel to take up
        // the space until another one is created.
        if (lastPanel) {
          this.__addPlaceholder(parentFrame);
          return true;
        }

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

  /**
   * Moves a docking panel from its current location to another.
   * @param {wcPanel} panel                             - The panel to move.
   * @param {wcDocker.DOCK} location                    - The new docking location of the panel.
   * @param {wcPanel|wcDocker.COLLAPSED} [targetPanel]  - A target panel to dock relative to, or use {@link wcDocker.COLLAPSED} to collapse it to the side or bottom.
   * @param {wcDocker~PanelOptions} [options]           - Other options for panel placement.
   * @returns {wcPanel|Boolean} - The panel that was created, or false on failure.
   */
  movePanel: function(panel, location, targetPanel, options) {
    var lastPanel = this.__isLastPanel(panel);

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
      // Remove the panel from the frame.
      for (var i = 0; i < parentFrame._panelList.length; ++i) {
        if (parentFrame._panelList[i] === panel) {
          if (parentFrame.isCollapser()) {
            parentFrame._curTab = -1;
          } else if (parentFrame._curTab >= i) {
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

      if (!parentFrame.isCollapser() && parentFrame._curTab === -1 && parentFrame._panelList.length) {
        parentFrame._curTab = 0;
      }

      parentFrame.__updateTabs();
      parentFrame.collapse();

      // If no more panels remain in this frame, remove the frame.
      if (!parentFrame.isCollapser() && parentFrame._panelList.length === 0) {
        // If this is the last frame, create a dummy panel to take up
        // the space until another one is created.
        if (lastPanel) {
          this.__addPlaceholder(parentFrame);
        } else {
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

            if (targetPanel === parentSplitter) {
              targetPanel._shift = other;
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
    }

    panel.initSize(width, height);
    if (location === wcDocker.DOCK.STACKED) {
      this.__addPanelGrouped(panel, targetPanel, options);
    } else {
      this.__addPanelAlone(panel, location, targetPanel, options);
    }

    if (targetPanel == this._placeholderPanel) {
      this.removePanel(this._placeholderPanel);
      this._placeholderPanel = null;
    }

    var frame = panel._parent;
    if (frame instanceof wcFrame) {
      if (frame._panelList.length === 1) {
        frame.pos(offset.left + width/2 + 20, offset.top + height/2 + 20, true);
      }
    }

    this.__update(true);

    if (frame instanceof wcFrame) {
      if (floating !== frame._isFloating) {
        if (frame._isFloating) {
          panel.__trigger(wcDocker.EVENT.DETACHED);
        } else {
          panel.__trigger(wcDocker.EVENT.ATTACHED);
        }
      }
    }

    panel.__trigger(wcDocker.EVENT.MOVED);
    return panel;
  },

  /**
   * Finds all instances of a given panel type.
   * @param {String} [typeName] - The name identifier for the panel. If not supplied, all panels are retrieved.
   * @returns {wcPanel[]} - A list of all panels found of the given type.
   */
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

  /**
   * Shows the loading screen.
   * @param {String} [label] - An optional label to display.
   * @param {Number} [opacity=0.4] - If supplied, assigns a custom opacity value to the loading screen.
   * @param {Number} [textOpacity=1] - If supplied, assigns a custom opacity value to the loading icon and text displayed.
   */
  startLoading: function(label, opacity, textOpacity) {
    if (!this.$loading) {
      this.$loading = $('<div class="wcLoadingContainer"></div>');
      this.$outer.append(this.$loading);

      var $background = $('<div class="wcLoadingBackground"></div>');
      if (typeof opacity !== 'number') {
        opacity = 0.4;
      }

      $background.css('opacity', opacity);
      this.$loading.append($background);

      var $icon = $('<div class="wcLoadingIconContainer"><i class="wcLoadingIcon ' + this._options.loadingClass + '"></i></div>');
      this.$loading.append($icon);

      if (label) {
        var $label = $('<span class="wcLoadingLabel">' + label + '</span>');
        this.$loading.append($label);
      }

      if (typeof textOpacity !== 'number') {
        textOpacity = 1;
      }

      $icon.css('opacity', textOpacity);

      if ($label) {
        $label.css('opacity', textOpacity);
      }
    }
  },

  /**
   * Hides the loading screen.
   * @param {Number} [fadeDuration=0] - The fade out duration for the loading screen.
   */
  finishLoading: function(fadeDuration) {
    if (this.$loading) {
      if (fadeDuration > 0) {
        var self = this;
        this.$loading.fadeOut(fadeDuration, function() {
          self.$loading.remove();
          self.$loading = null;
        });
      } else {
        this.$loading.remove();
        this.$loading = null;
      }
    }
  },

  /**
   * Registers a global [event]{@link wcDocker.EVENT}.
   * @param {wcDocker.EVENT} eventType        - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~event:onEvent} handler  - A handler function to be called for the event.
   * @returns {Boolean} Success or failure that the event has been registered.
   */
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

  /**
   * Unregisters a global [event]{@link wcDocker.EVENT}.
   * @param {wcDocker.EVENT} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~event:onEvent} [handler]  - The handler function registered with the event. If omitted, all events registered to the event type are unregistered.
   */
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

  /**
   * Trigger an [event]{@link wcDocker.EVENT} on all panels.
   * @fires wcDocker~event:onEvent
   * @param {wcDocker.EVENT} eventType  - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {Object} [data]             - A custom data object to be passed along with the event.
   */
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

  /**
   * Assigns a basic context menu to a selector element.  The context
   * Menu is a simple list of options, no nesting or special options.<br><br>
   *
   * If you wish to use a more complex context menu, you can use
   * [jQuery.contextMenu]{@link http://medialize.github.io/jQuery-contextMenu/docs.html} directly.
   * @deprecated Renamed to [wcDocker.menu}{@link wcDocker#menu}.
   * @param {external:jQuery~selector} selector                               - A selector string that designates the elements who use this menu.
   * @param {external:jQuery#contextMenu~item[]|Function} itemListOrBuildFunc - An array with each context menu item in it, or a function to call that returns one.
   * @param {Boolean} includeDefault                                          - If true, all default menu options will be included.
   */
  basicMenu: function(selector, itemListOrBuildFunc, includeDefault) {
    console.log('WARNING: wcDocker.basicMenu is deprecated, please use wcDocker.menu instead.');
    this.menu(selector, itemListOrBuildFunc, includeDefault);
  },

  /**
   * Assigns a basic context menu to a selector element.  The context
   * Menu is a simple list of options, no nesting or special options.<br><br>
   *
   * If you wish to use a more complex context menu, you can use
   * [jQuery.contextMenu]{@link http://medialize.github.io/jQuery-contextMenu/docs.html} directly.
   * @param {external:jQuery~selector} selector                               - A selector string that designates the elements who use this menu.
   * @param {external:jQuery#contextMenu~item[]|Function} itemListOrBuildFunc - An array with each context menu item in it, or a function to call that returns one.
   * @param {Boolean} includeDefault                                          - If true, all default menu options will be included.
   */
  menu: function(selector, itemListOrBuildFunc, includeDefault) {
    var self = this;
    $.contextMenu({
      selector: selector,
      build: function($trigger, event) {
        var mouse = self.__mouse(event);
        var myFrame;
        for (var i = 0; i < self._frameList.length; ++i) {
          var $frame = $trigger.hasClass('wcFrame') && $trigger || $trigger.parents('.wcFrame');
          if (self._frameList[i].$frame[0] === $frame[0]) {
            myFrame = self._frameList[i];
            break;
          }
        }

        var isTitle = false;
        if ($(event.target).hasClass('wcTabScroller')) {
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

        var collapseTypes = {};
        var defaultCollapse = '';
        if (self.isCollapseEnabled()) {

          var $icon = myFrame.$collapse.children('div');
          if ($icon.hasClass('wcCollapseLeft')) {
            defaultCollapse = ' wcCollapseLeft';
          } else if ($icon.hasClass('wcCollapseRight')) {
            defaultCollapse = ' wcCollapseRight';
          } else {
            defaultCollapse = ' wcCollapseBottom';
          }

          collapseTypes[wcDocker.DOCK.LEFT] = {
            name: wcDocker.DOCK.LEFT,
            faicon: 'sign-in wcCollapseLeft wcCollapsible',
          };
          collapseTypes[wcDocker.DOCK.RIGHT] = {
            name: wcDocker.DOCK.RIGHT,
            faicon: 'sign-in wcCollapseRight wcCollapsible',
          };
          collapseTypes[wcDocker.DOCK.BOTTOM] = {
            name: wcDocker.DOCK.BOTTOM,
            faicon: 'sign-in wcCollapseBottom wcCollapsible',
          };
        }

        var items = finalItems;

        if (includeDefault) {
          if (!$.isEmptyObject(finalItems)) {
            items['sep' + separatorIndex++] = "---------";
          }

          if (isTitle) {
            items['Close Panel'] = {
              name: 'Remove Panel',
              faicon: 'close',
              disabled: !myFrame.panel().closeable(),
            };
            if (self.isCollapseEnabled()) {
              if (!myFrame.isCollapser()) {
                items.fold1 = {
                  name: 'Collapse Panel',
                  faicon: 'sign-in' + defaultCollapse + ' wcCollapsible',
                  items: collapseTypes,
                  disabled: !myFrame.panel().moveable()
                }
              } else {
                items['Attach Panel'] = {
                  name: 'Dock Panel',
                  faicon: 'sign-out' + defaultCollapse + ' wcCollapsed',
                  disabled: !myFrame.panel().moveable()
                }
              }
            }
            if (!myFrame._isFloating) {
              items['Detach Panel'] = {
                name: 'Float Panel',
                faicon: 'level-up',
                disabled: !myFrame.panel().moveable() || myFrame.panel()._isPlaceholder,
              };
            }

            items['sep' + separatorIndex++] = "---------";

            items.fold2 = {
              name: 'Add Panel',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(myFrame.panel()._titleVisible && (!myFrame._isFloating || self._modalList.indexOf(myFrame) === -1)),
              className: 'wcMenuCreatePanel',
            };
          } else {
            if (myFrame) {
              items['Close Panel'] = {
                name: 'Remove Panel',
                faicon: 'close',
                disabled: !myFrame.panel().closeable(),
              };
              if (self.isCollapseEnabled()) {
                if (!myFrame.isCollapser()) {
                  items.fold1 = {
                    name: 'Collapse Panel',
                    faicon: 'sign-in' + defaultCollapse + ' wcCollapsible',
                    items: collapseTypes,
                    disabled: !myFrame.panel().moveable()
                  }
                } else {
                  items['Attach Panel'] = {
                    name: 'Dock Panel',
                    faicon: 'sign-out' + defaultCollapse + ' wcCollapsed',
                    disabled: !myFrame.panel().moveable()
                  }
                }
              }
              if (!myFrame._isFloating) {
                items['Detach Panel'] = {
                  name: 'Float Panel',
                  faicon: 'level-up',
                  disabled: !myFrame.panel().moveable() || myFrame.panel()._isPlaceholder,
                };
              }

              items['sep' + separatorIndex++] = "---------";
            }

            items.fold2 = {
              name: 'Add Panel',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(!myFrame || (!myFrame._isFloating && myFrame.panel().moveable())),
              className: 'wcMenuCreatePanel',
            };
          }

          if (myFrame && !myFrame._isFloating && myFrame.panel().moveable()) {
            var rect = myFrame.__rect();
            self._ghost = new wcGhost(rect, mouse, self);
            myFrame.__checkAnchorDrop(mouse, false, self._ghost, true, false);
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
              self.movePanel(myFrame.panel(), wcDocker.DOCK.FLOAT, false);
            } else if (key === 'Attach Panel') {
              var $icon = myFrame.$collapse.children('div');
              var position = wcDocker.DOCK.BOTTOM;
              if ($icon.hasClass('wcCollapseLeft')) {
                position = wcDocker.DOCK.LEFT;
              } else if ($icon.hasClass('wcCollapseRight')) {
                position = wcDocker.DOCK.RIGHT;
              }
              var opts = {};
              switch (position) {
                case wcDocker.DOCK.LEFT:
                  opts.w = myFrame.$frame.width();
                  break;
                case wcDocker.DOCK.RIGHT:
                  opts.w = myFrame.$frame.width();
                  break;
                case wcDocker.DOCK.BOTTOM:
                  opts.h = myFrame.$frame.height();
                  break;
              }
              var target = self._collapser[wcDocker.DOCK.LEFT]._parent.right();
              myFrame.collapse(true);
              self.movePanel(myFrame.panel(), position, target, opts);
            } else if (key === wcDocker.DOCK.LEFT) {
              self.movePanel(myFrame.panel(), wcDocker.DOCK.LEFT, wcDocker.COLLAPSED);
            } else if (key === wcDocker.DOCK.RIGHT) {
              self.movePanel(myFrame.panel(), wcDocker.DOCK.RIGHT, wcDocker.COLLAPSED);
            } else if (key === wcDocker.DOCK.BOTTOM) {
              self.movePanel(myFrame.panel(), wcDocker.DOCK.BOTTOM, wcDocker.COLLAPSED);
            } else {
              if (self._ghost && (myFrame)) {
                var anchor = self._ghost.anchor();
                var target = myFrame.panel();
                if (anchor.item) {
                  target = anchor.item._parent;
                }
                var newPanel = self.addPanel(key, anchor.loc, target, self._ghost.rect());
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
                self._ghost.destroy();
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

  /**
   * Bypasses the next context menu event.
   * Use this during a mouse up event in which you do not want the
   * context menu to appear when it normally would have.
   */
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

  /**
   * Saves the current panel configuration into a serialized
   * string that can be used later to restore it.
   * @returns {String} - A serialized string that describes the current panel configuration.
   */
  save: function() {
    var data = {};

    data.floating = [];
    for (var i = 0; i < this._floatingList.length; ++i) {
      data.floating.push(this._floatingList[i].__save());
    }

    data.root = this._root.__save();

    if (!$.isEmptyObject(this._collapser)) {
      data.collapsers = {
        left:   this._collapser[wcDocker.DOCK.LEFT].__save(),
        right:  this._collapser[wcDocker.DOCK.RIGHT].__save(),
        bottom: this._collapser[wcDocker.DOCK.BOTTOM].__save(),
      };
    }

    return JSON.stringify(data, function(key, value) {
      if (value == Infinity) {
        return "Infinity";
      }
      return value;
    });
  },

  /**
   * Restores a previously saved configuration.
   * @param {String} dataString - A previously saved serialized string, See [wcDocker.save]{@link wcDocker#save}.
   */
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

    this.__forceUpdate(false);

    if (!$.isEmptyObject(data.collapsers) && this.isCollapseEnabled()) {
      this.__initCollapsers();

      this._collapser[wcDocker.DOCK.LEFT].__restore(data.collapsers.left, this);
      this._collapser[wcDocker.DOCK.RIGHT].__restore(data.collapsers.right, this);
      this._collapser[wcDocker.DOCK.BOTTOM].__restore(data.collapsers.bottom, this);

      var self = this;
      setTimeout(function() {self.__forceUpdate();});
    }
  },

  /**
   * Clears all contents from the docker instance.
   */
  clear: function() {
    this._root = null;

    // Make sure we notify all panels that they are closing.
    this.trigger(wcDocker.EVENT.CLOSED);

    for (var i = 0; i < this._splitterList.length; ++i) {
      this._splitterList[i].__destroy();
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      this._frameList[i].__destroy();
    }

    if (!$.isEmptyObject(this._collapser)) {
      this._collapser[wcDocker.DOCK.LEFT].__destroy();
      this._collapser[wcDocker.DOCK.RIGHT].__destroy();
      this._collapser[wcDocker.DOCK.BOTTOM].__destroy();
      this._collapser = {};
    }

    while (this._frameList.length) this._frameList.pop();
    while (this._floatingList.length) this._floatingList.pop();
    while (this._splitterList.length) this._splitterList.pop();
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  __init: function() {
    var self = this;

    this.__compatibilityCheck();

    this._root = null;
    this.__addPlaceholder();

    // Setup our context menus.
    if (this._options.allowContextMenu) {
      this.menu('.wcFrame', [], true);
    }

    this.theme(this._options.theme);

    // Set up our responsive updater.
    this._updateId = setInterval(function() {
      if (self._dirty) {
        self._dirty = false;
        if (self._root) {
          self._root.__update();
        }

        for (var i = 0; i < self._floatingList.length; ++i) {
          self._floatingList[i].__update();
        }
      }
    }, this._options.responseRate);

    $(window).resize(this.__resize.bind(this));
    $('body').on('contextmenu', 'a, img', __onContextShowNormal);
    $('body').on('contextmenu', '.wcSplitterBar', __onContextDisable);

    // $('body').on('selectstart', '.wcFrameTitleBar, .wcPanelTab, .wcFrameButton', function(event) {
    //   event.preventDefault();
    // });

    // Hovering over a panel creation context menu.
    $('body').on('mouseenter', '.wcMenuCreatePanel', __onEnterCreatePanel);
    $('body').on('mouseleave', '.wcMenuCreatePanel', __onLeaveCreatePanel);

    // Mouse move will allow you to move an object that is being dragged.
    $('body').on('mousemove', __onMouseMove);
    $('body').on('touchmove', __onMouseMove);
    // A catch all on mouse down to record the mouse origin position.
    $('body').on('mousedown', __onMouseDown);
    $('body').on('touchstart', __onMouseDown);
    $('body').on('mousedown', '.wcModalBlocker', __onMouseDownModalBlocker);
    $('body').on('touchstart', '.wcModalBlocker', __onMouseDownModalBlocker);
    // On some browsers, clicking and dragging a tab will drag it's graphic around.
    // Here I am disabling this as it interferes with my own drag-drop.
    $('body').on('mousedown', '.wcPanelTab', __onPreventDefault);
    $('body').on('touchstart', '.wcPanelTab', __onPreventDefault);
    $('body').on('mousedown', '.wcFrameButtonBar > .wcFrameButton', __onMouseSelectionBlocker);
    $('body').on('touchstart', '.wcFrameButtonBar > .wcFrameButton', __onMouseSelectionBlocker);
    // Mouse down on a frame title will allow you to move them.
    $('body').on('mousedown', '.wcFrameTitleBar', __onMouseDownFrameTitle);
    $('body').on('touchstart', '.wcFrameTitleBar', __onMouseDownFrameTitle);
    // Mouse down on a splitter bar will allow you to resize them.
    $('body').on('mousedown', '.wcSplitterBar', __onMouseDownSplitter);
    $('body').on('touchstart', '.wcSplitterBar', __onMouseDownSplitter);
    // Middle mouse button on a panel tab to close it.
    $('body').on('mousedown', '.wcPanelTab', __onMouseDownPanelTab);
    $('body').on('touchstart', '.wcPanelTab', __onMouseDownPanelTab);
    // Middle mouse button on a panel tab to close it.
    $('body').on('mouseup', '.wcPanelTab', __onReleasePanelTab);
    $('body').on('touchend', '.wcPanelTab', __onReleasePanelTab);
    // Mouse down on a panel will put it into focus.
    $('body').on('mousedown', '.wcLayout', __onMouseDownLayout);
    $('body').on('touchstart', '.wcLayout', __onMouseDownLayout);
    // Floating frames have resizable edges.
    $('body').on('mousedown', '.wcFrameEdge', __onMouseDownResizeFrame);
    $('body').on('touchstart', '.wcFrameEdge', __onMouseDownResizeFrame);
    // Create new panels.
    $('body').on('mousedown', '.wcCreatePanel', __onMouseDownCreatePanel);
    $('body').on('touchstart', '.wcCreatePanel', __onMouseDownCreatePanel);
    // Mouse released
    $('body').on('mouseup', __onMouseUp);
    $('body').on('touchend', __onMouseUp);

    // Clicking on a custom tab button.
    $('body').on('click', '.wcCustomTab .wcFrameButton', __onClickCustomTabButton);
    // Clicking on a panel frame button.
    $('body').on('click', '.wcFrameButtonBar > .wcFrameButton', __onClickPanelButton);

    // Escape key to cancel drag operations.
    $('body').on('keyup', __onKeyup);

    // on mousedown
    function __onMouseDown(event) {
      var mouse = self.__mouse(event);
      self._mouseOrigin.x = mouse.x;
      self._mouseOrigin.y = mouse.y;
    };

    // on mouseup
    function __onMouseUp(event) {
      var mouse = self.__mouse(event);
      if (mouse.which === 3) {
        return true;
      }
      self.$container.removeClass('wcDisableSelection');
      if (self._draggingFrame) {
        for (var i = 0; i < self._frameList.length; ++i) {
          self._frameList[i].__shadow(false);
        }
      }

      if (self._ghost && (self._draggingFrame || self._creatingPanel)) {
        var anchor = self._ghost.anchor();

        if (self._draggingFrame) {
          if (!anchor) {
            if (!self._draggingFrameTab) {
              self._draggingFrame.panel(0);
            }

            if (self._draggingFrameTab || !self.__isLastFrame(self._draggingFrame)) {
              var panel = self._draggingFrame.panel(parseInt($(self._draggingFrameTab).attr('id')));
              self.movePanel(panel, wcDocker.DOCK.FLOAT, null, self._ghost.__rect());
              // Dragging the entire frame.
              if (!self._draggingFrameTab) {
                while (self._draggingFrame.panel()) {
                  self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK.STACKED, panel, {tabOrientation: self._draggingFrame._tabOrientation});
                }
              }

              var frame = panel._parent;
              if (frame instanceof wcFrame) {
                frame.pos(mouse.x, mouse.y + self._ghost.__rect().h/2 - 10, true);

                frame._size.x = self._ghost.__rect().w;
                frame._size.y = self._ghost.__rect().h;
              }

              frame.__update();
              self.__focus(frame);
            }
          } else if (!anchor.self && anchor.loc !== undefined) {
            // Changing tab location on the same frame.
            if (anchor.tab && anchor.item._parent._parent == self._draggingFrame) {
              self._draggingFrame.tabOrientation(anchor.tab);
            } else {
              var index = 0;
              if (self._draggingFrameTab) {
                index = parseInt($(self._draggingFrameTab).attr('id'));
              } else {
                self._draggingFrame.panel(0);
              }
              var panel;
              if (anchor.item) {
                panel = anchor.item._parent;
              }
              // If we are dragging a tab to split its own container, find another
              // tab item within the same frame and split from there.
              if (self._draggingFrame._panelList.indexOf(panel) > -1) {
                // Can not split the frame if it is the only panel inside.
                if (self._draggingFrame._panelList.length === 1) {
                  return;
                }
                for (var i = 0; i < self._draggingFrame._panelList.length; ++i) {
                  if (panel !== self._draggingFrame._panelList[i]) {
                    panel = self._draggingFrame._panelList[i];
                    index--;
                    break;
                  }
                }
              }
              var movingPanel = null;
              if (self._draggingFrameTab) {
                movingPanel = self._draggingFrame.panel(parseInt($(self._draggingFrameTab).attr('id')));
              } else {
                movingPanel = self._draggingFrame.panel();
              }
              panel = self.movePanel(movingPanel, anchor.loc, panel, self._ghost.rect());
              panel._parent.panel(panel._parent._panelList.length-1, true);
              // Dragging the entire frame.
              if (!self._draggingFrameTab) {
                var rect = self._ghost.rect();
                if (!rect.tabOrientation) {
                  rect.tabOrientation = self._draggingFrame.tabOrientation();
                }
                while (self._draggingFrame.panel()) {
                  self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK.STACKED, panel, rect);
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
              self.__focus(frame);
            }
          }
        } else if (self._creatingPanel) {
          var loc = wcDocker.DOCK.FLOAT;
          var target = null;
          if (anchor) {
            loc = anchor.loc;
            if (anchor.item) {
              target = anchor.item._parent;
            } else {
              target = anchor.panel;
            }
          }
          self.addPanel(self._creatingPanel, loc, target, self._ghost.rect());
        }

        self._ghost.destroy();
        self._ghost = null;

        self.trigger(wcDocker.EVENT.END_DOCK);
        self.__update();
      }

      if (self._draggingSplitter) {
        self._draggingSplitter.$pane[0].removeClass('wcResizing');
        self._draggingSplitter.$pane[1].removeClass('wcResizing');
      }

      self._draggingSplitter = null;
      self._draggingFrame = null;
      self._draggingFrameSizer = null;
      self._draggingFrameTab = null;
      self._draggingFrameTopper = false;
      self._draggingCustomTabFrame = null;
      self._removingPanel = null;
      return true;
    };

    // on mousemove
    var lastMouseMove = new Date().getTime();
    var lastMouseEvent = null;
    var moveTimeout = 0;
    function __onMouseMove(event) {
      lastMouseEvent = event;
      var mouse = self.__mouse(event);
      if (mouse.which === 3 || (
        !self._draggingSplitter &&
        !self._draggingFrameSizer &&
        !self._draggingCustomTabFrame &&
        !self._ghost &&
        !self._draggingFrame &&
        !self._draggingFrameTab)) {
        return true;
      }

      var t = new Date().getTime();
      if (t - lastMouseMove < self._options.responseRate) {
        if (!moveTimeout) {
          moveTimeout = setTimeout(function() {
            lastMouseMove = 0;
            moveTimeout = 0;
            __onMouseMove(lastMouseEvent);
          }, self._options.responseRate);
        }
        return true;
      }

      lastMouseMove = new Date().getTime();

      if (self._draggingSplitter) {
        self._draggingSplitter.__moveBar(mouse);
      } else if (self._draggingFrameSizer) {
        var offset = self.$container.offset();
        mouse.x += offset.left;
        mouse.y += offset.top;

        self._draggingFrame.__resize(self._draggingFrameSizer, mouse);
        self._draggingFrame.__update();
      } else if (self._draggingCustomTabFrame) {
        var $hoverTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parents('.wcPanelTab');
        if (self._draggingFrameTab && $hoverTab && $hoverTab.length && self._draggingFrameTab !== event.target) {
          self._draggingFrameTab = self._draggingCustomTabFrame.moveTab(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
        }
      } else if (self._ghost) {
        if (self._draggingFrame) {
          self._ghost.__move(mouse);
          var forceFloat = !(self._draggingFrame._isFloating || mouse.which === 1);
          var found = false;

          // Check anchoring with self.
          if (!self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, self._draggingFrame._panelList.length > 1 && self._draggingFrameTab, self._draggingFrameTopper)) {
            self._draggingFrame.__shadow(true);
            self.__focus();
            if (!forceFloat) {
              for (var i = 0; i < self._frameList.length; ++i) {
                if (self._frameList[i] !== self._draggingFrame) {
                  if (self._frameList[i].__checkAnchorDrop(mouse, false, self._ghost, true, self._draggingFrameTopper)) {
                    self._draggingFrame.__shadow(true);
                    return;
                  }
                }
              }
            }

            self._ghost.anchor(mouse, null);
          } else {
            self._draggingFrame.__shadow(false);
            var $target = $(document.elementFromPoint(mouse.x, mouse.y));
            var $hoverTab = $target.hasClass('wcPanelTab')? $target: $target.parents('.wcPanelTab');
            if (self._draggingFrameTab && $hoverTab.length && self._draggingFrameTab !== $hoverTab[0]) {
              self._draggingFrameTab = self._draggingFrame.__tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($hoverTab.attr('id')));
            }
          }
        } else if (self._creatingPanel) {
          self._ghost.update(mouse);
        }
      } else if (self._draggingFrame && !self._draggingFrameTab) {
        self._draggingFrame.__move(mouse);
        self._draggingFrame.__update();
      }
      return true;
    };

    // on contextmenu for a, img
    function __onContextShowNormal() {
      if (this._contextTimer) {
        clearTimeout(this._contextTimer);
      }

      $(".wcFrame").contextMenu(false);
      this._contextTimer = setTimeout(function() {
        $(".wcFrame").contextMenu(true);
        this._contextTimer = null;
      }, 100);
      return true;
    };

    // on contextmenu for .wcSplitterBar
    function __onContextDisable() {
      return false;
    };

    // on mouseenter for .wcMenuCreatePanel
    function __onEnterCreatePanel() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeIn(200);
      }
    };

    // on mouseleave for .wcMenuCreatePanel
    function __onLeaveCreatePanel() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeOut(200);
      }
    };

    // on mousedown for .wcModalBlocker
    function __onMouseDownModalBlocker(event) {
      // for (var i = 0; i < self._modalList.length; ++i) {
      //   self._modalList[i].__focus(true);
      // }
      if (self._modalList.length) {
        self._modalList[self._modalList.length-1].__focus(true);
      }
    };

    // on mousedown for .wcPanelTab
    function __onPreventDefault(event) {
      event.preventDefault();
      event.returnValue = false;
    };

    // on mousedown for .wcFrameButtonBar > .wcFrameButton
    function __onMouseSelectionBlocker() {
      self.$container.addClass('wcDisableSelection');
    };

    // on click for .wcCustomTab .wcFrameButton
    function __onClickCustomTabButton(event) {
      self.$container.removeClass('wcDisableSelection');
      for (var i = 0; i < self._tabList.length; ++i) {
        var customTab = self._tabList[i];
        if (customTab.$close[0] === this) {
          var tabIndex = customTab.tab();
          customTab.removeTab(tabIndex);
          event.stopPropagation();
          return;
        }

        if (customTab.$tabLeft[0] === this) {
          customTab._tabScrollPos-=customTab.$tabBar.width()/2;
          if (customTab._tabScrollPos < 0) {
            customTab._tabScrollPos = 0;
          }
          customTab.__updateTabs();
          event.stopPropagation();
          return;
        }
        if (customTab.$tabRight[0] === this) {
          customTab._tabScrollPos+=customTab.$tabBar.width()/2;
          customTab.__updateTabs();
          event.stopPropagation();
          return;
        }
      }
    };

    // on click for .wcFrameButtonBar > .wcFrameButton
    function __onClickPanelButton() {
      self.$container.removeClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$close[0] === this) {
          var panel = frame.panel();
          self.removePanel(panel);
          self.__update();
          return;
        }
        if (frame.$collapse[0] === this) {
          var $icon = frame.$collapse.children('div');
          var position = wcDocker.DOCK.BOTTOM;
          if ($icon.hasClass('wcCollapseLeft')) {
            position = wcDocker.DOCK.LEFT;
          } else if ($icon.hasClass('wcCollapseRight')) {
            position = wcDocker.DOCK.RIGHT;
          }
          if (frame.isCollapser()) {
            // Un-collapse
            // var target;
            var opts = {};
            switch (position) {
              case wcDocker.DOCK.LEFT:
                // target = frame._parent._parent.right();
                opts.w = frame.$frame.width();
                break;
              case wcDocker.DOCK.RIGHT:
                // target = frame._parent._parent.left();
                opts.w = frame.$frame.width();
                break;
              case wcDocker.DOCK.BOTTOM:
                // target = frame._parent._parent.top();
                opts.h = frame.$frame.height();
                break;
            }
            var target = self._collapser[wcDocker.DOCK.LEFT]._parent.right();
            frame.collapse(true);
            self.movePanel(frame.panel(), position, target, opts);
          } else {
            // collapse.
            self.movePanel(frame.panel(), position, wcDocker.COLLAPSED);
          }
          self.__update();
          return;
        }
        if (frame.$tabLeft[0] === this) {
          frame._tabScrollPos-=frame.$tabBar.width()/2;
          if (frame._tabScrollPos < 0) {
            frame._tabScrollPos = 0;
          }
          frame.__updateTabs();
          return;
        }
        if (frame.$tabRight[0] === this) {
          frame._tabScrollPos+=frame.$tabBar.width()/2;
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
            panel.__trigger(wcDocker.EVENT.BUTTON, result);
            return;
          }
        }
      }
    };

    // on mouseup for .wcPanelTab
    function __onReleasePanelTab(event) {
      var mouse = self.__mouse(event);
      if (mouse.which !== 2) {
        return;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$tabBar[0] === $(this).parents('.wcFrameTitleBar')[0]) {
          var panel = frame._panelList[index];
          if (self._removingPanel === panel) {
            self.removePanel(panel);
            self.__update();
          }
          return;
        }
      }
    };

    // on mousedown for .wcSplitterBar
    function __onMouseDownSplitter(event) {
      var mouse = self.__mouse(event);
      if (mouse.which !== 1) {
        return true;
      }

      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          self._draggingSplitter.$pane[0].addClass('wcResizing');
          self._draggingSplitter.$pane[1].addClass('wcResizing');
          event.preventDefault();
          break;
        }
      }
      return true;
    };

    // on mousedown for .wcFrameTitleBar
    function __onMouseDownFrameTitle(event) {
      var mouse = self.__mouse(event);
      if (mouse.which === 3) {
        return true;
      }
      // Skip frame buttons, they are handled elsewhere (Buttons may also have a child image or span so we check parent as well);
      if ($(event.target).hasClass('wcFrameButton') || $(event.target).parents('.wcFrameButton').length) {
        return true;
      }

      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$titleBar[0] == this ||
            self._frameList[i].$tabBar[0] == this) {
          self._draggingFrame = self._frameList[i];

          self._draggingFrame.__anchorMove(mouse);

          var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parents('.wcPanelTab');
          if ($panelTab && $panelTab.length) {
            var index = parseInt($panelTab.attr('id'));
            self._draggingFrame.panel(index, true);
            self._draggingFrameTab = $panelTab[0];
            $(window).focus();
          }

          // If the window is able to be docked, give it a dark shadow tint and begin the movement process
          var shouldMove = true;
          if (self._draggingFrameTab) {
            if ($panelTab.hasClass('wcNotMoveable')) {
              shouldMove = false;
            }
          } else {
            if (self._draggingFrame._isFloating && mouse.which === 1) {
              shouldMove = false;
            }
          }

          // if (((!$panelTab.hasClass('wcNotMoveable') && self._draggingFrameTab) ||
          //     !(self._draggingFrame.$titleBar.hasClass('wcNotMoveable') || self._draggingFrame.$tabBar.hasClass('wcNotMoveable'))) &&
          //     (!self._draggingFrame._isFloating || mouse.which !== 1 || self._draggingFrameTab)) {
          if (shouldMove) {
            // Special case to allow users to drag out only a single collapsed tab even by dragging the title bar (which normally would drag out the entire frame).
            if (!self._draggingFrameTab && self._draggingFrame.isCollapser()) {
              self._draggingFrameTab = self._draggingFrame.panel();
            }
            self._draggingFrameTopper = $(event.target).parents('.wcFrameTopper').length > 0;
            var rect = self._draggingFrame.__rect();
            self._ghost = new wcGhost(rect, mouse, self);
            self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, true, self._draggingFrameTopper);
            self.trigger(wcDocker.EVENT.BEGIN_DOCK);
          }
          break;
        }
      }
      for (var i = 0; i < self._tabList.length; ++i) {
        if (self._tabList[i].$tabBar[0] == this) {
          self._draggingCustomTabFrame = self._tabList[i];

          var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parents('.wcPanelTab');
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
    };

    // on mousedown for .wcLayout
    function __onMouseDownLayout(event) {
      var mouse = self.__mouse(event);
      if (mouse.which === 3) {
        return true;
      }
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].panel() && self._frameList[i].panel().layout().$table[0] == this) {
          setTimeout(function() {
            self.__focus(self._frameList[i]);
          }, 10);
          break;
        }
      }
      return true;
    };

    // on mousedown for .wcFrameEdge
    function __onMouseDownResizeFrame(event) {
      var mouse = self.__mouse(event);
      if (mouse.which === 3) {
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
    };

    // on mousedown for .wcCreatePanel
    function __onMouseDownCreatePanel(event) {
      var mouse = self.__mouse(event);
      if (mouse.which !== 1) {
        return true;
      }

      var panelType = $(this).data('panel');
      var info = self.panelTypeInfo(panelType);
      if (info) {
        var rect = {
          x: mouse.x-250,
          y: mouse.y,
          w: 500,
          h: 500,
        };
        self.$container.addClass('wcDisableSelection');
        self._ghost = new wcGhost(rect, mouse, self);
        self._ghost.update(mouse);
        self._ghost.anchor(mouse, self._ghost.anchor());
        self._creatingPanel = panelType;
        self.__focus();
        self.trigger(wcDocker.EVENT.BEGIN_DOCK);
      }
    }

    // on mousedown for .wcPanelTab
    function __onMouseDownPanelTab(event) {
      var mouse = self.__mouse(event);
      if (mouse.which !== 2) {
        return true;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$tabBar[0] === $(this).parents('.wcFrameTitleBar')[0]) {
          var panel = frame._panelList[index];
          self._removingPanel = panel;
          return true;
        }
      }
      return true;
    };

    // on keyup
    function __onKeyup(event) {
      if (event.keyCode == 27) {
        if (self._ghost) {
          self._ghost.destroy();
          self._ghost = false;
          self.trigger(wcDocker.EVENT.END_DOCK);

          if (self._draggingFrame) {
            self._draggingFrame.__shadow(false);
          }
          self._creatingPanel = false;
          self._draggingSplitter = null;
          self._draggingFrame = null;
          self._draggingFrameSizer = null;
          self._draggingFrameTab = null;
          self._draggingFrameTopper = false;
          self._draggingCustomTabFrame = null;
          self._removingPanel = null;
        }
      }
    };
  },

  // Test for load completion.
  __testLoadFinished: function() {
    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        // Skip if any panels are not initialized yet.
        if (panel._isVisible && !panel._initialized) {
          return;
        }

        // Skip if any panels still have a loading screen.
        if (panel.$loading) {
          return;
        }
      }
    }

    // If we reach this point, all existing panels are initialized and loaded!
    this.trigger(wcDocker.EVENT.LOADED);

    // Now unregister all loaded events so they do not fire again.
    this.off(wcDocker.EVENT.LOADED);
    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        panel.off(wcDocker.EVENT.LOADED);
      }
    }
  },

  // Test for browser compatability issues.
  __compatibilityCheck: function() {
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

    // Check if the browser supports transformations. If not, we cannot rotate tabs or collapse panels.
    var ie = (function(){
        var v = 3;
        var div = document.createElement('div');
        var all = div.getElementsByTagName('i');
        while (
            div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
            all[0]
        );
        return v > 4 ? v : undefined;
    }());

    if (ie < 9) {
      this._canOrientTabs = false;
    } else {
      function getSupportedTransform() {
        var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
        var div = document.createElement('div');
        for(var i = 0; i < prefixes.length; i++) {
          if(div && div.style[prefixes[i]] !== undefined) {
            return true;
          }
        }
        return false;
      };
      this._canOrientTabs = getSupportedTransform();
    }

    // Check if we are running on a mobile device so we can alter themes accordingly.
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    $('body').addClass(isMobile? "wcMobile": "wcDesktop");
  },

  /*
   * Searches docked panels and splitters for a container that is within any static areas.
   */
  __findInner: function() {
    function isPaneStatic(pane) {
      if (pane && (pane instanceof wcFrame && pane.panel() && !pane.panel().moveable()) || (pane instanceof wcCollapser)) {
        return true;
      }
      return false;
    };

    var parent = this._root;
    while (parent) {
      if (parent instanceof wcSplitter) {
        var pane0 = isPaneStatic(parent._pane[0]);
        var pane1 = isPaneStatic(parent._pane[1]);
        if (pane0 && !pane1) {
          parent = parent._pane[1];
        } else if (pane1 && !pane0) {
          parent = parent._pane[0];
        } else if (!pane0 && !pane1) {
          break;
        }
      } else {
        break;
      }
    }

    return parent;
  },

  /*
   * Sets up the collapsers for the panel.<br>
   * <b>Note: </b> This should be called AFTER you have initialized your panel layout, but BEFORE you add
   * any static panels that you do not wish to be overlapped by the collapsers (such as file menu panels).
   */
  __initCollapsers: function() {
    // Initialize collapsers if it is enabled and not already initialized.
    if (!this.isCollapseEnabled() || !$.isEmptyObject(this._collapser)) {
      return;
    }

    var parent = this.__findInner();
    function __createCollapser(location) {
      this._collapser[location] = this.__addCollapser(location, parent);
      parent = this._collapser[location]._parent;
      this._frameList.push(this._collapser[location]._drawer._frame);
    }

    __createCollapser.call(this, wcDocker.DOCK.LEFT);
    __createCollapser.call(this, wcDocker.DOCK.RIGHT);
    __createCollapser.call(this, wcDocker.DOCK.BOTTOM);

    var self = this;
    setTimeout(function() {
      self.__update();
    });
  },

  // Updates the sizing of all panels inside this window.
  __update: function(opt_dontMove) {
    this._dirty = true;
  },

  // Forces an update, regardless of the response rate.
  __forceUpdate: function(opt_dontMove) {
    this._dirty = false;
    if (this._root) {
      this._root.__update(opt_dontMove);
    }

    for (var i = 0; i < this._floatingList.length; ++i) {
      this._floatingList[i].__update();
    }
  },

  // Retrieve mouse or touch position.
  __mouse: function(event) {
    if (event.originalEvent && (event.originalEvent.touches || event.originalEvent.changedTouches)) {
      var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
      return {
        x: touch.clientX,
        y: touch.clientY,
        which: 1,
      };
    }

    return {
      x: event.clientX || event.pageX,
      y: event.clientY || event.pageY,
      which: event.which || 1,
    };
  },

  // On window resized event.
  __resize: function(event) {
    this._resizeData.time = new Date();
    if (!this._resizeData.timeout) {
      this._resizeData.timeout = true;
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
      this.__trigger(wcDocker.EVENT.RESIZE_STARTED);
    }
    this.__trigger(wcDocker.EVENT.RESIZED);
    this.__update(false);
  },

  // On window resize event ended.
  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT.RESIZE_ENDED);
    }
  },

  // Brings a floating window to the top.
  // Params:
  //    frame     The frame to focus.
  //    flash     Whether to flash the frame.
  __focus: function(frame, flash) {
    var differentFrames = this._focusFrame != frame;
    if (this._focusFrame) {
      if (this._focusFrame._isFloating) {
        this._focusFrame.$frame.removeClass('wcFloatingFocus');
      }

      var oldFocusFrame = this._focusFrame;
      this._focusFrame = null;

      oldFocusFrame.__trigger(wcDocker.EVENT.LOST_FOCUS);
      if (oldFocusFrame.isCollapser() && differentFrames) {
        oldFocusFrame.collapse();
        oldFocusFrame.panel(-1);
      }
    }

    this._focusFrame = frame;
    if (this._focusFrame) {
      if (this._focusFrame._isFloating) {
        this._focusFrame.$frame.addClass('wcFloatingFocus');

        if (differentFrames) {
          $('body').append(this._focusFrame.$frame);
        }
      }
      this._focusFrame.__focus(flash);

      this._focusFrame.__trigger(wcDocker.EVENT.GAIN_FOCUS);
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
      if (testFrame._isFloating || testFrame.isCollapser()) {
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
      if (testFrame._isFloating || testFrame === frame || testFrame.isCollapser()) {
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

  // Attempts to insert a given dock panel into an already existing frame.
  // If insertion is not possible for any reason, the panel will be
  // placed in its own frame instead.
  // Params:
  //    panel         The panel to insert.
  //    targetPanel   An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  __addPanelGrouped: function(panel, targetPanel, options) {
    var frame = targetPanel;
    if (targetPanel instanceof wcPanel) {
      frame = targetPanel._parent;
    }

    if (frame instanceof wcFrame) {
      if (options && options.tabOrientation) {
        frame.tabOrientation(options.tabOrientation);
      }

      frame.addPanel(panel);
      return;
    }

    // If we did not manage to find a place for this panel, last resort is to put it in its own frame.
    this.__addPanelAlone(panel, wcDocker.DOCK.LEFT, targetPanel, options);
  },

  // Creates a new frame for the panel and then attaches it
  // to the window.
  // Params:
  //    panel         The panel to insert.
  //    location      The desired location for the panel.
  //    targetPanel   An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  __addPanelAlone: function(panel, location, targetPanel, options) {
    if (targetPanel && targetPanel._shift) {
      var target = targetPanel;
      targetPanel = targetPanel._shift;
      target._shift = undefined;
    }

    if (options) {
      var width = this.$container.width();
      var height = this.$container.height();

      if (options.hasOwnProperty('x')) {
        options.x = this.__stringToPixel(options.x, width);
      }
      if (options.hasOwnProperty('y')) {
        options.y = this.__stringToPixel(options.y, height);
      }
      if (!options.hasOwnProperty('w')) {
        options.w = panel.initSize().x;
      }
      if (!options.hasOwnProperty('h')) {
        options.h = panel.initSize().y;
      }
      options.w = this.__stringToPixel(options.w, width);
      options.h = this.__stringToPixel(options.h, height);

      panel._size.x = options.w;
      panel._size.y = options.h;
    }

    // If we are collapsing the panel, put it into the collapser.
    if (targetPanel === wcDocker.COLLAPSED) {
      this.__initCollapsers();
      if (this._collapser[location]) {
        targetPanel = this._collapser[location]._drawer._frame.addPanel(panel);
        var self = this;
        setTimeout(function() {self.__update();});
        return panel;
      } else {
        console.log('ERROR: Attempted to collapse panel "' + panel._type + '" to invalid location: ' + location);
        return false;
      }
    }

    // Floating windows need no placement.
    if (location === wcDocker.DOCK.FLOAT || location === wcDocker.DOCK.MODAL) {
      var frame = new wcFrame(this.$container, this, true);
      if (options && options.tabOrientation) {
        frame.tabOrientation(options.tabOrientation);
      }
      this._frameList.push(frame);
      this._floatingList.push(frame);
      this.__focus(frame);
      frame.addPanel(panel);
      frame.pos(panel._pos.x, panel._pos.y, false);

      if (location === wcDocker.DOCK.MODAL) {
        frame.$modalBlocker = $('<div class="wcModalBlocker"></div>');
        frame.$frame.prepend(frame.$modalBlocker);

        panel.moveable(false);
        frame.$frame.addClass('wcModal');
        this._modalList.push(frame);
      }

      if (options) {
        var pos = frame.pos(undefined, undefined, true);
        if (options.hasOwnProperty('x')) {
          pos.x = options.x + options.w/2;
        }
        if (options.hasOwnProperty('y')) {
          pos.y = options.y + options.h/2;
        }
        frame.pos(pos.x, pos.y, true);
        frame._size = {
          x: options.w,
          y: options.h,
        };
      }
      return;
    }

    if (targetPanel) {
      var parentSplitter = targetPanel._parent;
      var splitterChild = targetPanel;
      while (!(parentSplitter instanceof wcSplitter || parentSplitter instanceof wcDocker)) {
        splitterChild = parentSplitter;
        parentSplitter = parentSplitter._parent;
      }

      if (parentSplitter instanceof wcSplitter) {
        var splitter;
        var left  = parentSplitter.pane(0);
        var right = parentSplitter.pane(1);
        var size = {
          x: -1,
          y: -1,
        };
        if (left === splitterChild) {
          splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
          size.x = parentSplitter.$pane[0].width();
          size.y = parentSplitter.$pane[0].height();
          parentSplitter.pane(0, splitter);
        } else {
          splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
          size.x = parentSplitter.$pane[1].width();
          size.y = parentSplitter.$pane[1].height();
          parentSplitter.pane(1, splitter);
        }

        if (splitter) {
          splitter.scrollable(0, false, false);
          splitter.scrollable(1, false, false);

          if (!options) {
            options = {
              w: panel._size.x,
              h: panel._size.y,
            };
          }

          if (options) {
            if (options.w < 0) {
              options.w = size.x/2;
            }
            if (options.h < 0) {
              options.h = size.y/2;
            }

            switch (location) {
              case wcDocker.DOCK.LEFT:
                splitter.pos(options.w / size.x);
                break;
              case wcDocker.DOCK.RIGHT:
                splitter.pos(1.0 - (options.w / size.x));
                break;
              case wcDocker.DOCK.TOP:
                splitter.pos(options.h / size.y);
                break;
              case wcDocker.DOCK.BOTTOM:
                splitter.pos(1.0 - (options.h / size.y));
                break;
            }
          } else {
            splitter.pos(0.5);
          }

          frame = new wcFrame(this.$transition, splitter, false);
          this._frameList.push(frame);
          if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
            splitter.pane(0, frame);
            splitter.pane(1, splitterChild);
          } else {
            splitter.pane(0, splitterChild);
            splitter.pane(1, frame);
          }

          frame.addPanel(panel);
        }
        return;
      }
    }

    var parent = this;
    var $container = this.$container;
    var frame = new wcFrame(this.$transition, parent, false);
    this._frameList.push(frame);

    if (!parent._root) {
      parent._root = frame;
      frame.__container($container);
    } else {
      var splitter = new wcSplitter($container, parent, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
      if (splitter) {
        frame._parent = splitter;
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);
        var size = {
          x: $container.width(),
          y: $container.height(),
        };

        if (!options) {
          splitter.__findBestPos();
        } else {
          if (options.w < 0) {
            options.w = size.x/2;
          }
          if (options.h < 0) {
            options.h = size.y/2;
          }

          switch (location) {
            case wcDocker.DOCK.LEFT:
              splitter.pos(options.w / size.x);
              break;
            case wcDocker.DOCK.RIGHT:
              splitter.pos(1.0 - (options.w / size.x));
              break;
            case wcDocker.DOCK.TOP:
              splitter.pos(options.h / size.y);
              break;
            case wcDocker.DOCK.BOTTOM:
              splitter.pos(1.0 - (options.h / size.y));
              break;
          }
        }

        if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
          splitter.pane(0, frame);
          splitter.pane(1, parent._root);
        } else {
          splitter.pane(0, parent._root);
          splitter.pane(1, frame);
        }

        parent._root = splitter;
      }
    }

    frame.addPanel(panel);
  },

  __addCollapser: function(location, parent) {
    var collapser = null;
    if (parent) {
      var parentSplitter = parent._parent;
      var splitterChild = parent;
      while (!(parentSplitter instanceof wcSplitter || parentSplitter instanceof wcDocker)) {
        splitterChild = parentSplitter;
        parentSplitter = parentSplitter._parent;
      }

      var splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
      if (parentSplitter instanceof wcDocker) {
        this._root = splitter;
        splitter.__container(this.$container);
      }

      if (parentSplitter instanceof wcSplitter) {
        var left  = parentSplitter.left();
        var right = parentSplitter.right();
        var size = {
          x: -1,
          y: -1,
        };
        if (left === splitterChild) {
          size.x = parentSplitter.$pane[0].width();
          size.y = parentSplitter.$pane[0].height();
          parentSplitter.pane(0, splitter);
        } else {
          splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK.BOTTOM && location !== wcDocker.DOCK.TOP);
          size.x = parentSplitter.$pane[1].width();
          size.y = parentSplitter.$pane[1].height();
          parentSplitter.pane(1, splitter);
        }
      }

      if (splitter) {
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);
        collapser = new wcCollapser(this.$transition, splitter, location);

        switch (location) {
          case wcDocker.DOCK.TOP:
          case wcDocker.DOCK.LEFT:
            splitter.pos(0);
            break;
          case wcDocker.DOCK.BOTTOM:
          case wcDocker.DOCK.RIGHT:
            splitter.pos(1);
            break;
        }

        if (location === wcDocker.DOCK.LEFT || location === wcDocker.DOCK.TOP) {
          splitter.pane(0, collapser);
          splitter.pane(1, splitterChild);
        } else {
          splitter.pane(0, splitterChild);
          splitter.pane(1, collapser);
        }
      }
    }
    return collapser;
  },

  // Adds the placeholder panel as needed
  __addPlaceholder: function(targetPanel) {
    if (this._placeholderPanel) {
      console.log('WARNING: wcDocker creating placeholder panel when one already exists');
    }

    this._placeholderPanel = new wcPanel(wcDocker.PANEL_PLACEHOLDER, {});
    this._placeholderPanel._isPlaceholder = true;
    this._placeholderPanel._parent = this;
    this._placeholderPanel.__container(this.$transition);
    this._placeholderPanel._panelObject = new function(myPanel) {
      myPanel.title(false);
      myPanel.closeable(false);
    }(this._placeholderPanel);

    if (targetPanel) {
      this.__addPanelGrouped(this._placeholderPanel, targetPanel);
    } else {
      this.__addPanelAlone(this._placeholderPanel, wcDocker.DOCK.TOP);
    }

    this.__update();
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

  this._outer = docker.__findInner();
  if (this._outer instanceof wcSplitter) {
    this._inner = this._outer.right();
  }

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
    if (anchor.self && anchor.loc === wcDocker.DOCK.STACKED) {
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
      height: anchor.h + 'px'
    }, 150);
  },

  // --------------------------------------------------------------------------------
  rect: function() {
    return {
      x: this.$ghost.offset().left,
      y: this.$ghost.offset().top,
      w: parseInt(this.$ghost.css('width')),
      h: parseInt(this.$ghost.css('height')),
      tabOrientation: this._anchor && this._anchor.tab,
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
/**
 * @class
 * A gridded layout for arranging elements. [Panels]{@link wcPanel}, [splitter widgets]{@link wcSplitter}
 * and [tab widgets]{@link wcTabFrame} contain these by default to handle their contents.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE</i> - <u>This should never be constructed directly by the user</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcLayout|wcSplitter|wcDocker} parent   - The layout's parent object.
 */
function wcLayout(container, parent) {
  /**
   * The outer container element of the panel.
   *
   * @member {external:jQuery~Object}
   */
  this.$container = $(container);
  this._parent = parent;

  this._batchProcess = false;
  this._grid = [];

  /**
   * The table DOM element for the layout.
   *
   * @member {external:jQuery~Object}
   */
  this.$table = null;

  this.__init();
};

wcLayout.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Adds an item into the layout, expanding the grid size if necessary.
   *
   * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} item - A DOM element to add.
   * @param {Number} [x=0] - The horizontal grid position to place the element.
   * @param {Number} [y=0] - The vertical grid position to place the element.
   * @param {Number} [w=1] - The number of horizontal cells this item will take within the grid.
   * @param {Number} [h=1] - The number of vertical cells this item will take within the grid.
   *
   * @returns {wcLayout~tableItem|Boolean} The table data element of the cell that contains the item, or false if there was a problem.
   */
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
    return this.item(x, y);
  },

  /**
   * Retrieves the table item at a given grid position, if it exists.
   * Note, if an item spans multiple cells, only the top-left most
   * cell will actually contain the table item.
   *
   * @param {Number} x - The horizontal grid position.
   * @param {Number} y - The vertical grid position.
   *
   * @returns {wcLayout~tableItem|Boolean} - The table item, or false if none was found.
   */
  item: function(x, y) {
    if (y >= this._grid.length) {
      return false;
    }

    if (x >= this._grid[y].length) {
      return false;
    }

    // Some cells are a merging of multiple cells. If this cell is
    // part of a merge for another cell, use that cell instead.
    // if (this._grid[y][x].x < 0 || this._grid[y][x].y < 0) {
    //   var grid = this._grid[y][x];
    //   x -= grid.x;
    //   y -= grid.y;
    // }

    var self = this;
    /**
     * The table item is an object that represents one cell in the layout table, it contains
     * convenient methods for cell alteration and supports chaining. Its purpose is
     * to remove the need to alter &lt;tr&gt; and &lt;td&gt; elements of the table directly.
     * @version 3.0.0
     *
     * @example myPanel.addItem(domNode).css('text-align', 'right').css('border', '1px solid black').stretch('100%', '100%');
     *
     * @typedef wcLayout~tableItem
     * @property {jQuery~Object} $ - If you truely need the table cell [jQuery object]{@link jQuery~Object}, here it is.
     * @property {wcLayout~css} css - Wrapper to alter [jQuery's css]{@link http://api.jquery.com/css/} function.
     * @property {wcLayout~stretch} stretch - More reliable method for setting the table item width/height values.
     */
    var myItem = {
      $: self._grid[y][x].$el,

      /**
       * <small><i>This function is found in {@link wcLayout~tableItem}.</small></i><br>
       * A wrapper for [jQuery's css]{@link http://api.jquery.com/css/} function.
       * <b>Note:</b> It is recommended that you use [stretch]{@link wcLayout~stretch} if you intend to alter width or height styles.
       * @version 3.0.0
       *
       * @function wcLayout~css
       * @param {String} style - The style attribute to alter.
       * @param {String} [value] - The value of the attribute. If omitted, the current value of the attribute is returned instead of the [tableItem]{@link wcLayout~tableItem} instance.
       *
       * @returns {wcLayout~tableItem|String} - Self, for chaining, unless the value parameter was omitted.
       */
      css: function(style, value) {
        if (self._grid[y][x].$el) {
          if (value === undefined) {
            return self._grid[y][x].$el.css(style);
          }

          self._grid[y][x].$el.css(style, value);
        }
        return myItem;
      },

      /**
       * <small><i>This function is found in {@link wcLayout~tableItem}.</small></i><br>
       * Sets the stretch amount for the current table item. This is more reliable than
       * assigning width and height style attributes directly on the table item.
       * @version 3.0.0
       *
       * @function wcLayout~stretch
       * @param {Number|String} [sx] - The horizontal stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
       * @param {Number|String} [sy] - The vertical stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
       *
       * @returns {wcLayout~tableItem} - Self, for chaining.
       */
      stretch: function(width, height) {
        self.itemStretch(x, y, width, height);
        return myItem;
      },
    };
    return myItem;
  },

  /**
   * Sets the stretch amount for a given table item. This is more reliable than
   * assigning width and height style attributes directly on the table item.
   * @version 3.0.0
   *
   * @param {Number} x - The horizontal grid position.
   * @param {Number} y - The vertical grid position.
   * @param {Number|String} [sx] - The horizontal stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [sy] - The vertical stretch for this grid. Use empty string to clear current value. Can be a pixel position, or a string with a 'px' or '%' suffix.
   *
   * @returns {Boolean} - Success or failure. A failure generally means your grid position was a merged grid cell.
   */
  itemStretch: function(x, y, sx, sy) {
    var wasBatched = this._batchProcess;

    this._batchProcess = true;
    this.__resizeGrid(x, y);

    var grid = this._grid[y][x];
    if (grid.x < 0 || grid.y < 0) {
      return false;
    }

    if (sx !== undefined) {
      grid.sx = sx;
    }
    if (sy !== undefined) {
      grid.sy = sy;
    }

    this._batchProcess = wasBatched;
    if (!wasBatched) {
      this.__resizeGrid(0, 0);
    }

    return true;
  },

  /**
   * Clears the contents of the layout and squashes all rows
   * and columns from the grid.
   */
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

  /**
   * Begins a batch operation.  Basically it refrains from constructing
   * the layout grid, which causes a reflow, on each item added.  Instead,
   * The grid is only generated at the end once [wcLayout.finishBatch]{@link wcLayout#finishBatch} is called.
   */
  startBatch: function() {
    this._batchProcess = true;
  },

  /**
   * Ends a batch operation. See [wcLayout.startBatch]{@link wcLayout#startBatch} for more information.
   */
  finishBatch: function() {
    this._batchProcess = false;
    this.__resizeGrid(0, 0);
  },

  /**
   * Gets, or Sets whether the layout grid cells should draw an outline.
   *
   * @param {Boolean} [enabled] - If supplied, will set the grid cell border visibility.
   *
   * @returns {Boolean} - The current visibility state of the grid cells.
   */
  showGrid: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGrid', enabled);
    }

    return this.$table.hasClass('wcLayoutGrid');
  },

  /**
   * Gets, or Sets the spacing between cell borders.
   *
   * @param {Number} [size] - If supplied, sets the pixel size of the spacing between cells.
   *
   * @returns {Number} - The current cell spacing in pixels.
   */
  gridSpacing: function(size) {
    if (typeof size !== 'undefined') {
      this.$table.css('border-spacing', size + 'px');
    }

    return parseInt(this.$table.css('border-spacing'));
  },

  /**
   * Gets, or Sets whether the table rows alternate in color based on the theme.
   *
   * @params {Boolean} [enabled] - If supplied, will set whether the grid alternates in color.
   *
   * @returns {Boolean} - Whether the grid alternates in color.
   */
  gridAlternate: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this.$table.toggleClass('wcLayoutGridAlternate', enabled);
    }

    return this.$table.hasClass('wcLayoutGridAlternate');
  },

  /**
   * Retrieves the table element.
   * @deprecated please use [wcLayout.$table]{@link wcLayout#$table} directly.
   */
  scene: function() {
    console.log('wcLayout.scene() has been deprecated, please use wcLayout.$table instead. This function will be removed in the next version.');
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
        var row = [];
        row.$row = $('<tr>');
        this._grid.push(row);
      }

      for (var x = 0; x <= width; ++x) {
        if (this._grid[y].length <= x) {
          this._grid[y].push({
            $el: $('<td>'),
            x: 0,
            y: 0,
            sx: '',
            sy: '',
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
              $row = this._grid[y].$row;
              $newBody.append($row);
            }

            item.$el.css('width', item.sx);
            item.$el.css('height', item.sy);
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
  //    mouse                 The current mouse position.
  //    same                  Whether we are hovering over the same panel that is being moved.
  //    ghost                 An instance to the ghost object.
  //    canSplit              Whether the original panel can be split.
  //    $elem                 The container element for the target panel.
  //    title                 Whether the panel has a title bar visible.
  //    isTopper              Whether the item being dragged is the top title bar, as apposed to dragging a side or bottom tab/bar.
  //    forceTabOrientation   Force a specific tab orientation.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit, $elem, title, isTopper, forceTabOrientation) {
    var width = $elem.outerWidth();
    var height = $elem.outerHeight();
    var offset = $elem.offset();
    var titleSize = $elem.find('.wcFrameTitleBar').height();
    if (!title) {
      titleSize = 0;
    }

    // First, test for edge anchoring.
    if (ghost._outer) {
      var outerWidth  = ghost._outer.$container.outerWidth();
      var outerHeight = ghost._outer.$container.outerHeight();
      var outerOffset = ghost._outer.$container.offset();

      var EDGE_SIZE = 50;

      // Left edge
      if (mouse.y >= outerOffset.top && mouse.y <= outerOffset.top + outerHeight &&
          mouse.x >= outerOffset.left + titleSize && mouse.x <= outerOffset.left + titleSize + EDGE_SIZE) {
        ghost.anchor(mouse, {
          x: outerOffset.left-2,
          y: outerOffset.top-2,
          w: outerWidth/3,
          h: outerHeight,
          loc: wcDocker.DOCK.LEFT,
          item: ghost._inner,
          self: false
        });
        return true;
      }
      // Right edge
      else if (mouse.y >= outerOffset.top && mouse.y <= outerOffset.top + outerHeight &&
          mouse.x >= outerOffset.left + outerWidth - EDGE_SIZE - titleSize && mouse.x <= outerOffset.left + outerWidth - titleSize) {
        ghost.anchor(mouse, {
          x: outerOffset.left + outerWidth - (outerWidth/3) - 2,
          y: outerOffset.top-2,
          w: outerWidth/3,
          h: outerHeight,
          loc: wcDocker.DOCK.RIGHT,
          item: ghost._inner,
          self: false
        });
        return true;
      }
      // Top edge
      else if (mouse.y >= outerOffset.top + titleSize && mouse.y <= outerOffset.top + titleSize + EDGE_SIZE &&
          mouse.x >= outerOffset.left && mouse.x <= outerOffset.left + outerWidth) {
        ghost.anchor(mouse, {
          x: outerOffset.left-2,
          y: outerOffset.top-2,
          w: outerWidth,
          h: outerHeight/3,
          loc: wcDocker.DOCK.TOP,
          item: ghost._inner,
          self: false
        });
        return true;
      }
      // Bottom edge
      else if (mouse.y >= outerOffset.top + outerHeight - titleSize - EDGE_SIZE && mouse.y <= outerOffset.top + outerHeight - titleSize &&
          mouse.x >= outerOffset.left && mouse.x <= outerOffset.left + outerWidth) {
        ghost.anchor(mouse, {
          x: outerOffset.left-2,
          y: outerOffset.top + outerHeight - (outerHeight/3) - 2,
          w: outerWidth,
          h: outerHeight/3,
          loc: wcDocker.DOCK.BOTTOM,
          item: ghost._inner,
          self: false
        });
        return true;
      }
    }

    // If the target panel has a title, hovering over it (on all sides) will cause stacking
    // and also change the orientation of the tabs (if enabled).
    if (title) {
      // Top title bar
      if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.TOP) &&
          mouse.y >= offset.top && mouse.y <= offset.top + titleSize &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {

        // Stacking with top orientation.
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: titleSize-2,
          loc: wcDocker.DOCK.STACKED,
          tab: wcDocker.TAB.TOP,
          item: this,
          self: same === wcDocker.TAB.TOP || (isTopper && same)
        });
        return true;
      }
      // Any other tab orientation is only valid if tab orientation is enabled.
      else if (this._parent.docker()._canOrientTabs) {
        // Bottom bar
        if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.BOTTOM) &&
            mouse.y >= offset.top + height - titleSize && mouse.y <= offset.top + height &&
            mouse.x >= offset.left && mouse.x <= offset.left + width) {

          // Stacking with bottom orientation.
          ghost.anchor(mouse, {
            x: offset.left-2,
            y: offset.top + height - titleSize-2,
            w: width,
            h: titleSize,
            loc: wcDocker.DOCK.STACKED,
            tab: wcDocker.TAB.BOTTOM,
            item: this,
            self: same === wcDocker.TAB.BOTTOM
          });
          return true;
        }
        // Left bar
        else if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.LEFT) &&
            mouse.y >= offset.top && mouse.y <= offset.top + height &&
            mouse.x >= offset.left && mouse.x <= offset.left + titleSize) {

          // Stacking with bottom orientation.
          ghost.anchor(mouse, {
            x: offset.left-2,
            y: offset.top-2,
            w: titleSize-2,
            h: height,
            loc: wcDocker.DOCK.STACKED,
            tab: wcDocker.TAB.LEFT,
            item: this,
            self: same === wcDocker.TAB.LEFT
          });
          return true;
        }
        // Right bar
        else if ((!forceTabOrientation || forceTabOrientation === wcDocker.TAB.RIGHT) &&
            mouse.y >= offset.top && mouse.y <= offset.top + height &&
            mouse.x >= offset.left + width - titleSize && mouse.x <= offset.left + width) {

          // Stacking with bottom orientation.
          ghost.anchor(mouse, {
            x: offset.left + width - titleSize-2,
            y: offset.top-2,
            w: titleSize,
            h: height,
            loc: wcDocker.DOCK.STACKED,
            tab: wcDocker.TAB.RIGHT,
            item: this,
            self: same === wcDocker.TAB.RIGHT
          });
          return true;
        }
      }
    }

    if (!canSplit) {
      return false;
    }

    // Check for placeholder.
    if (this._parent instanceof wcPanel && this._parent._isPlaceholder) {
      ghost.anchor(mouse, {
        x: offset.left-2,
        y: offset.top-2,
        w: width,
        h: height,
        loc: wcDocker.DOCK.TOP,
        item: this,
        self: false
      });
      return true;
    }

    if (width < height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.TOP,
          item: this,
          self: false
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top + (height - height*0.5)-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.BOTTOM,
          item: this,
          self: false
        });
        return true;
      }
    }

    // Left side docking
    if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
      if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK.LEFT,
          item: this,
          self: false
        });
        return true;
      }

      // Right side docking
      if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left + width*0.5-2,
          y: offset.top-2,
          w: width*0.5,
          h: height,
          loc: wcDocker.DOCK.RIGHT,
          item: this,
          self: false
        });
        return true;
      }
    }

    if (width >= height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.TOP,
          item: this,
          self: false
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left-2,
          y: offset.top + (height - height*0.5)-2,
          w: width,
          h: height*0.5,
          loc: wcDocker.DOCK.BOTTOM,
          item: this,
          self: false
        });
        return true;
      }
    }
    return false;
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
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
/**
 * @class
 * The public interface for the docking panel, it contains a number of convenience
 * functions and a [layout]{@link wcLayout} that can be filled with a custom arrangement
 * of elements.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE</i> - Use [wcDocker.addPanel]{@link wcDocker#addPanel}, [wcDocker.removePanel]{@link wcDocker#removePanel}, and
 * [wcDocker.movePanel]{@link wcDocker#movePanel} to manage panels, <u>this should never be constructed directly
 * by the user.</u></b>
 * @param {String} type - The name identifier for the panel.
 * @param {wcPanel~options} [options] - An options object passed from registration of the panel.
*/
function wcPanel(type, options) {

  /**
   * An options object for the [panel]{@link wcPanel} constructor.
   * @typedef wcPanel~options
   * @property {String} [icon] - A CSS classname that represents the icon that should display on this panel's tab widget.
   * @property {String} [faicon] - An icon name using the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
   * @property {String|Boolean} [title] - A custom title to display for this panel, if false, title bar will not be shown.
   */

  /**
   * The outer container element of the panel.
   * @member {external:jQuery~Object}
   */
  this.$container = null;
  this._parent = null;
  this.$icon = null;
  this.$title = null;
  this.$titleText = null;
  this.$loading = null;

  this._panelObject = null;
  this._initialized = false;

  this._type = type;
  this._title = type;
  this._titleVisible = true;

  this._options = options;

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

  this._collapsible = true;
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

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Gets, or Sets the title for this panel.
   * Titles appear in the tab widget associated with the panel.
   * @param {String|Boolean} title - If supplied, sets the new title (this can be html text). If false, the title bar will be removed.
   * @returns {String|Boolean} - The current title.
   */
  title: function(title) {
    if (typeof title !== 'undefined') {
      if (title === false) {
        this._titleVisible = false;
        this.$titleText.html(this._type);
      } else {
        this._title = title;
        this.$titleText.html(title);
      }

      if (this.$icon) {
        this.$titleText.prepend(this.$icon);
      }

      if (this._parent instanceof wcFrame) {
        this._parent.__updateTabs();
      }
    }

    return this._title;
  },

  /**
   * Retrieves the registration info of the panel as declared from
   * [wcDocker.registerPanelType]{@link wcDocker#registerPanelType};
   * See [wcDocker.panelTypeInfo]{@link wcDocker#panelTypeInfo}.
   * @returns {wcDocker~registerOptions} - Registered options of the panel type.
   */
  info: function() {
    return this.docker().panelTypeInfo(this._type);
  },

  /**
   * Retrieves the panel [layout]{@link wcLayout} instance.
   * @returns {wcLayout} - The layout instance.
   */
  layout: function() {
    return this._layout;
  },

  /**
   * Brings this panel into focus. If it is floating, it will be moved to the front
   * of all other panels.
   * @param {Boolean} [flash] - If true, in addition to bringing the panel into focus, it will also flash for the user.
   */
  focus: function(flash) {
    var docker = this.docker();
    if (docker) {
      docker.__focus(this._parent, flash);
      for (var i = 0; i < this._parent._panelList.length; ++i) {
        if (this._parent._panelList[i] === this && this._parent._curTab !== i) {
          this._parent.panel(i);
          break;
        }
      }
    }
  },

  /**
   * Retrieves whether this panel can be seen by the user.
   * @returns {Boolean} - Visibility state.
   */
  isVisible: function() {
    return this._isVisible;
  },

  /**
   * Retrieves whether this panel is floating.
   * @returns {Boolean}
   */
  isFloating: function() {
    if (this._parent instanceof wcFrame) {
      return this._parent._isFloating;
    }
    return false;
  },

  /**
   * Retrieves whether this panel is in focus.
   * @return {Boolean}
   */
  isInFocus: function() {
    var docker = this.docker();
    if (docker && this._parent instanceof wcFrame) {
      return this._parent === docker._focusFrame;
    }
    return false;
  },

  /**
   * Creates a new custom button that will appear in the title bar when the panel is active.
   * @param {String} name               - The name of the button, to identify it later.
   * @param {String} className          - A CSS class name to apply to the button.
   * @param {String} text               - Text to apply to the button.
   * @param {String} tip                - Tooltip text for the user.
   * @param {Boolean} [isTogglable]     - If true, will make the button toggle on and off per click.
   * @param {String} [toggleClassName]  - If this button is toggleable, you can designate an optional CSS class name that will replace the original class name.
   */
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
  },

  /**
   * Removes a custom button from the panel.
   * @param {String} name - The name identifier for the button to remove.
   * @returns {Boolean} - Success or failure.
   */
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

  /**
   * Gets, or Sets the current toggle state of a custom button that was
   * added using [wcPanel.addButton]{@link wcPanel#addButton}.
   * @param {String} name           - The name identifier of the button.
   * @param {Boolean} [toggleState] - If supplied, will assign a new toggle state to the button.
   * @returns {Boolean} - The current toggle state of the button.
   */
  buttonState: function(name, toggleState) {
    for (var i = 0; i < this._buttonList.length; ++i) {
      if (this._buttonList[i].name === name) {
        if (typeof toggleState !== 'undefined') {
          this._buttonList[i].isToggled = toggleState;
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

  /**
   * Gets, or Sets the default position of the panel if it is floating. <b>Warning: after the panel has been initialized, this value no longer reflects the current position of the panel.</b>
   * @param {Number|String} [x] - If supplied, sets the horizontal position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the vertical position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Coordinate} - The current default position of the panel.
   */
  initPos: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._pos.x = docker.__stringToPercent(x, docker.$container.width());
      } else {
        this._pos.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._pos.y = docker.__stringToPercent(y, docker.$container.height());
      } else {
        this._pos.y = y;
      }
    }

    return {x: this._pos.x, y: this._pos.y};
  },

  /**
   * Gets, or Sets the desired size of the panel. <b>Warning: after the panel has been initialized, this value no longer reflects the current size of the panel.</b>
   * @param {Number|String} [x] - If supplied, sets the desired initial horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired initial vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current initial size of the panel.
   */
  initSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._size.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._size.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._size.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._size.y = y;
      }
    }
    return {x: this._size.x, y: this._size.y};
  },

  /**
   * Gets, or Sets the minimum size constraint of the panel.
   * @param {Number|String} [x] - If supplied, sets the desired minimum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired minimum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current minimum size.
   */
  minSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._minSize.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._minSize.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._minSize.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._minSize.y = y;
      }
    }
    return {x: this._minSize.x, y: this._minSize.y};
  },

  /**
   * Gets, or Sets the maximum size constraint of the panel.
   * @param {Number|String} [x] - If supplied, sets the desired maximum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired maximum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current maximum size.
   */
  maxSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._maxSize.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._maxSize.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._maxSize.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._maxSize.y = y;
      }
    }
    return {x: this._maxSize.x, y: this._maxSize.y};
  },

  /**
   * Retrieves the width of the panel contents.
   * @returns {Number} - Panel width.
   */
  width: function() {
    if (this.$container) {
      return this.$container.width();
    }
    return 0.0;
  },

  /**
   * Retrieves the height of the panel contents.
   * @returns {Number} - Panel height.
   */
  height: function() {
    if (this.$container) {
      return this.$container.height();
    }
    return 0.0;
  },

  /**
   * Sets the icon for the panel, shown in the panels tab widget.
   * Must be a css class name that contains the icon.
   */
  icon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
      this.$titleText.prepend(this.$icon);
    }

    this.$icon.removeClass();
    this.$icon.addClass('wcTabIcon ' + icon);

    if (this._parent instanceof wcFrame) {
      this._parent.__updateTabs();
    }
  },

  /**
   * Sets the icon for the panel, shown in the panels tab widget,
   * to an icon defined from the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
   */
  faicon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
      this.$titleText.prepend(this.$icon);
    }

    this.$icon.removeClass();
    this.$icon.addClass('wcTabIcon fa fa-fw fa-' + icon);

    if (this._parent instanceof wcFrame) {
      this._parent.__updateTabs();
    }
  },

  /**
   * Gets, or Sets whether the window is scrollable.
   * @param {Boolean} [x] - If supplied, assigns whether the window is scrollable in the horizontal direction.
   * @param {Boolean} [y] - If supplied, assigns whether the window is scrollable in the vertical direction.
   * @returns {wcDocker~Scrollable} - The current scrollable status.
   */
  scrollable: function(x, y) {
    if (typeof x !== 'undefined') {
      this._scrollable.x = x? true: false;
      this._scrollable.y = y? true: false;
    }

    return {x: this._scrollable.x, y: this._scrollable.y};
  },

  /**
   * Gets, or Sets the scroll position of the panel's contents if it is scrollable; See [wcPanel.scrollable]{@link wcPanel#scrollable}).
   * @param {Number} [x]        - If supplied, sets the scroll horizontal position of the panel.
   * @param {Number} [y]        - If supplied, sets the scroll vertical position of the panel.
   * @param {Number} [duration] - If supplied, will animate the scroll movement with the supplied duration (in milliseconds).
   * @returns {wcDocker~Coordinate} The current scroll position.
   */
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

  /**
   * Gets, or Sets whether this panel can be collapsed to the side or bottom.<br>
   * This only works if the collapse feature is enabled {@link wcDocker~Options}.
   * @param {Boolean} [enabled] - If supplied, assigns whether collapsing is enabled.
   * @returns {Boolean} - The current collapsible enabled state.
   */
  collapsible: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._collapsible = enabled? true: false;
    }

    return this._collapsible;
  },

  /**
   * Gets, or Sets whether overflow on this panel is visible.
   * Use this if a child element within this panel is intended to 'popup' and be visible outside of its parent area.
   * @param {Boolean} [visible] - If supplied, assigns whether overflow is visible.
   * @returns {Boolean} - The current overflow visibility.
   */
  overflowVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._overflowVisible = visible? true: false;
    }

    return this._overflowVisible;
  },

  /**
   * Gets, or Sets whether the contents of the panel are visible on resize.
   * Use this if the panel has extremely expensive contents which take a long time to resize.
   * @param {Boolean} [visible] - If supplied, assigns whether panel contents are visible during resize.
   * @returns {Boolean} - The current resize visibility.
   */
  resizeVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._resizeVisible = visible? true: false;
    }

    return this._resizeVisible;
  },

  /**
   * Sets, or Gets the moveable status of the window.
   * Note: Other panels can not dock beside a non-moving panel as doing so could cause it to move.
   * @param {Boolean} [enabled] - If supplied, assigns whether this panel can be moved.
   * @returns {Boolean} - Whether the panel is moveable.
   */
  moveable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._moveable = enabled? true: false;

      this.$title.toggleClass('wcNotMoveable', !this._moveable);
    }

    return this._moveable;
  },

  /**
   * Gets, or Sets whether this dock window can be closed by the user.
   * Note: The panel can still be closed programmatically.
   * @param {Boolean} [enabled] - If supplied, toggles whether it can be closed.
   * @returns {Boolean} the current closeable status.
   */
  closeable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._closeable = enabled? true: false;
      if (this._parent) {
        this._parent.__update();
      }
    }

    return this._closeable;
  },

  /**
   * Forces the window to close.
   */
  close: function() {
    if (this._parent) {
      this._parent.$close.click();
    }
  },

  /**
   * Shows the loading screen.
   * @param {String} [label] - An optional label to display.
   * @param {Number} [opacity=0.4] - If supplied, assigns a custom opacity value to the loading screen.
   * @param {Number} [textOpacity=1] - If supplied, assigns a custom opacity value to the loading icon and text displayed.
   */
  startLoading: function(label, opacity, textOpacity) {
    if (!this.$loading) {
      this.$loading = $('<div class="wcLoadingContainer"></div>');
      this.$container.append(this.$loading);

      var $background = $('<div class="wcLoadingBackground"></div>');
      if (typeof opacity !== 'number') {
        opacity = 0.4;
      }

      this.$loading.append($background);

      var $icon = $('<div class="wcLoadingIconContainer"><i class="wcLoadingIcon ' + this.docker()._options.loadingClass + '"></i></div>');
      this.$loading.append($icon);

      if (label) {
        var $label = $('<span class="wcLoadingLabel">' + label + '</span>');
        this.$loading.append($label);
      }

      if (typeof textOpacity !== 'number') {
        textOpacity = 1;
      }

      // Override opacity values if the global loading screen is active.
      if (this.docker().$loading) {
        opacity = 0;
        textOpacity = 0;
      }

      $background.css('opacity', opacity);
      $icon.css('opacity', textOpacity);

      if ($label) {
        $label.css('opacity', textOpacity);
      }
    }
  },

  /**
   * Hides the loading screen.
   * @param {Number} [fadeDuration=0] - If supplied, assigns a fade out duration for the loading screen.
   */
  finishLoading: function(fadeDuration) {
    if (this.$loading) {
      if (fadeDuration > 0) {
        var self = this;
        this.$loading.fadeOut(fadeDuration, function() {
          self.$loading.remove();
          self.$loading = null;
          self.docker().__testLoadFinished();
        });
      } else {
        this.$loading.remove();
        this.$loading = null;
        this.docker().__testLoadFinished();
      }

    }
  },

  /**
   * Registers an [event]{@link wcDocker.EVENT} associated with this panel.
   * @param {String} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~onEvent} handler  - An event handler function to be called when the event is fired.
   * @returns {Boolean} - Event registration success or failure.
   */
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

  /**
   * Unregisters an [event]{@link wcDocker.EVENT} associated with this panel.
   * @param {wcDocker.EVENT} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~event:onEvent} [handler]  - The handler function registered with the event. If omitted, all events registered to the event type are unregistered.
   */
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

  /**
   * Triggers an [event]{@link wcDocker.EVENT} of a given type to all panels, including itself.
   * @param {wcDocker.EVENT} eventType  - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {Object} [data]             - A custom data object to pass into all handlers.
   */
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
    this.$title = $('<div class="wcPanelTab">');
    this.$titleText = $('<div>' + this._title + '</div>');
    this.$title.append(this.$titleText);

    if (this._options.hasOwnProperty('title')) {
      this.title(this._options.title);
    }

    if (this._options.icon) {
      this.icon(this._options.icon);
    }
    if (this._options.faicon) {
      this.faicon(this._options.faicon);
    }
  },

  // Updates the size of the layout.
  __update: function() {
    var docker = this.docker();
    if (!docker) return;

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
        self.__trigger(wcDocker.EVENT.INIT);

        docker.__testLoadFinished();
      }, 0);
    } else {
      this.__trigger(wcDocker.EVENT.UPDATED);
    }

    var width   = this.$container.width();
    var height  = this.$container.height();
    if (this._actualSize.x !== width || this._actualSize.y !== height) {
      this._actualSize.x = width;
      this._actualSize.y = height;

      this._resizeData.time = new Date();
      if (!this._resizeData.timeout) {
        this._resizeData.timeout = true;
        setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
        this.__trigger(wcDocker.EVENT.RESIZE_STARTED, {width: this._actualSize.x, height: this._actualSize.y});
      }
      this.__trigger(wcDocker.EVENT.RESIZED, {width: this._actualSize.x, height: this._actualSize.y});
    }

    var offset  = this.$container.offset();
    if (this._actualPos.x !== offset.left || this._actualPos.y !== offset.top) {
      this._actualPos.x = offset.left;
      this._actualPos.y = offset.top;

      this._moveData.time = new Date();
      if (!this._moveData.timeout) {
        this._moveData.timeout = true;
        setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
        this.__trigger(wcDocker.EVENT.MOVE_STARTED, {x: this._actualPos.x, y: this._actualPos.y});
      }
      this.__trigger(wcDocker.EVENT.MOVED, {x: this._actualPos.x, y: this._actualPos.y});
    }
  },

  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT.RESIZE_ENDED, {width: this._actualSize.x, height: this._actualSize.y});
    }
  },

  __moveEnd: function() {
    if (new Date() - this._moveData.time < this._moveData.delta) {
      setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
    } else {
      this._moveData.timeout = false;
      this.__trigger(wcDocker.EVENT.MOVE_ENDED, {x: this._actualPos.x, y: this._actualPos.y});
    }
  },

  __isVisible: function(inView) {
    if (this._isVisible !== inView) {
      this._isVisible = inView;

      this.__trigger(wcDocker.EVENT.VISIBILITY_CHANGED, this._isVisible);
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type = 'wcPanel';
    data.panelType = this._type;
    // data.title = this._title;
    data.size = {
      x: this._size.x,
      y: this._size.y,
    };
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
    this.__trigger(wcDocker.EVENT.SAVE_LAYOUT, data.customData);
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    // this._title = data.title;
    if (data.size) {
      this._size.x = data.size.x;
      this._size.y = data.size.y;
    }
    // this._minSize.x = data.minSize.x;
    // this._minSize.y = data.minSize.y;
    // this._maxSize.x = data.maxSize.x;
    // this._maxSize.y = data.maxSize.y;
    // this._scrollable.x = data.scrollable.x;
    // this._scrollable.y = data.scrollable.y;
    // this._moveable = data.moveable;
    // this._closeable = data.closeable;
    // this.resizeVisible(data.resizeVisible)
    this.__trigger(wcDocker.EVENT.RESTORE_LAYOUT, data.customData);
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
      if (this.$loading) {
        this.$container.append(this.$loading);
      }
    } else {
      this._layout.__container(null);
      this.finishLoading();
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
/**
 * @class
 * The frame is a [panel]{@link wcPanel} container.
 * Each panel appears as a tabbed item inside a frame.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE<i> - Handled internally by [docker]{@link wcDocker} and <u>should never be constructed by the user.</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this frame.
 * @param {wcSplitter|wcDocker} parent  - The frames parent object.
 * @param {Boolean} isFloating          - If true, the frame will be a floating window.
 */
function wcFrame(container, parent, isFloating) {
  /**
   * The container that holds the frame.
   * @member {external:jQuery~Object}
   */
  this.$container = $(container);
  this._parent = parent;
  this._isFloating = isFloating;

  /**
   * The outer frame element.
   * @member {external:jQuery~Object}
   */
  this.$frame     = null;
  this.$title     = null;
  this.$titleBar  = null;
  this.$tabBar    = null;
  this.$tabScroll = null;
  this.$center    = null;
  this.$tabLeft   = null;
  this.$tabRight  = null;
  this.$close     = null;
  this.$collapse  = null;
  this.$top       = null;
  this.$bottom    = null;
  this.$left      = null;
  this.$right     = null;
  this.$corner1   = null;
  this.$corner2   = null;
  this.$corner3   = null;
  this.$corner4   = null;
  this.$buttonBar = null;

  this.$shadower  = null;
  this.$modalBlocker = null;

  this._titleVisible = true;
  this._canScrollTabs = false;
  this._tabOrientation = wcDocker.TAB.TOP;
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

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Gets, or Sets the position of the frame.
   *
   * @param {Number} [x]        - If supplied, assigns a new horizontal position.
   * @param {Number} [y]        - If supplied, assigns a new vertical position.
   * @param {Boolean} [pixels]  - If true, the coordinates passed in will be treated as a pixel position rather than a percentage.
   *
   * @returns {wcDocker~Coordinate} - The current position of the frame. If the pixel parameter was true, the position will be in pixels.
   */
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

  /**
   * Gets the initially desired size of the panel.
   *
   * @returns {wcDocker~Size} - The initially desired size.
   */
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

  /**
   * Gets the minimum size of the frame.
   *
   * @returns {wcDocker~Size} - The minimum size of the frame.
   */
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

  /**
   * Gets the maximum size of the frame.
   *
   * @returns {wcDocker~Size} - The maximum size of the frame.
   */
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

  /**
   * Gets, or Sets the tab orientation for the frame. This puts the tabbed widgets visually on any side of the frame.
   * @version 3.0.0
   *
   * @param {wcDocker.TAB} [orientation] - Assigns the orientation of the tab items displayed.
   *
   * @returns {wcDocker.TAB} - The current orientation.
   */
  tabOrientation: function(orientation) {
    if (orientation !== undefined) {
      if (this._tabOrientation !== orientation && this.docker()._canOrientTabs) {
        this._tabOrientation = orientation;

        this.__updateTabs();
        this.__updateTabs();
      }
    }

    return this._tabOrientation
  },

  /**
   * Adds a given panel as a new tab item to the frame.
   *
   * @param {wcPanel} panel         - The panel to add.
   * @param {Number} [index]        - Insert index.
   */
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
      if (!this.isCollapser()) {
        this._curTab = 0;
      }
      this._size = this.initSize();
    }

    this.__updateTabs();
  },

  /**
   * Removes a given panel from the frame.
   *
   * @param {wcPanel} panel - The panel to remove.
   *
   * @returns {Boolean} - True if any panels still remain after the removal.
   */
  removePanel: function(panel) {
    for (var i = 0; i < this._panelList.length; ++i) {
      if (this._panelList[i] === panel) {
        if (this.isCollapser()) {
          this._curTab = -1;
        } else if (this._curTab >= i) {
          this._curTab--;
        }

        this._panelList[i].__container(null);
        this._panelList[i]._parent = null;

        this._panelList.splice(i, 1);
        break;
      }
    }

    if (this._curTab === -1) {
      if (!this.collapse() && this._panelList.length) {
        this._curTab = 0;
      }
    }

    this.__updateTabs();
    return this._panelList.length > 0;
  },

  /**
   * Gets, or Sets the currently visible panel.
   * @param {Number} [tabIndex] - If supplied, sets the current panel index.
   * @param {Boolean} [autoFocus] - If true, this tab will be focused (brought to front).
   * @returns {wcPanel} - The currently visible panel.
   */
  panel: function(tabIndex, autoFocus) {
    if (typeof tabIndex !== 'undefined') {
      if (this.isCollapser() && tabIndex === this._curTab) {
        this.collapse();
        tabIndex = -1;
      }
      if (tabIndex < this._panelList.length) {
        this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        if (this._curTab !== tabIndex) {
          this.collapse();
        }
        this._curTab = tabIndex;
        if (tabIndex > -1) {
          this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + tabIndex + '"]').addClass('wcPanelTabActive');
          this.$center.children('.wcPanelTabContent[id="' + tabIndex + '"]').removeClass('wcPanelTabContentHidden');
          this.expand();
        }
        this.__updateTabs(autoFocus);
      }
    }

    if (this._curTab > -1 && this._curTab < this._panelList.length) {
      return this._panelList[this._curTab];
    } else if (this.isCollapser() && this._panelList.length) {
      return this._panelList[0];
    }
    return false;
  },

  /**
   * Gets whether this frame is inside a collapser.
   *
   * @returns {Boolean} - Whether this frame is inside a collapser.
   */
  isCollapser: function() {
    return (this._parent instanceof wcDrawer);
  },

  /**
   * Collapses the frame, if it is a collapser.
   *
   * @param {Boolean} [instant] - If true, collapses without animating.
   */
  collapse: function(instant) {
    if (this.isCollapser()) {
      this._parent.collapse(instant);
      return true;
    }
    return false;
  },

  /**
   * Expands the frame, if it is a collapser.
   */
  expand: function() {
    if (this.isCollapser()) {
      this._parent.expand();
      return true;
    }
    return false;
  },

  /**
   * Gets whether the frame is expanded, if it is a collapser.
   *
   * @returns {Boolean|undefined} - The current expanded state, or undefined if it is not a collapser.
   */
  isExpanded: function() {
    if (this.isCollapser()) {
      return this._parent.isExpanded();
    }
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$frame         = $('<div class="wcFrame wcWide wcTall">');
    this.$title         = $('<div class="wcFrameTitle">');
    this.$titleBar      = $('<div class="wcFrameTitleBar wcFrameTopper">');
    this.$tabBar        = $('<div class="wcFrameTitleBar">');
    this.$tabScroll     = $('<div class="wcTabScroller">');
    this.$center        = $('<div class="wcFrameCenter wcPanelBackground">');
    this.$tabLeft       = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
    this.$tabRight      = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
    this.$close         = $('<div class="wcFrameButton" title="Close the currently active panel tab"><div class="fa fa-close"></div>X</div>');
    this.$collapse      = $('<div class="wcFrameButton" title="Collapse the active panel"><div class="fa fa-download"></div>C</div>');
    this.$buttonBar     = $('<div class="wcFrameButtonBar">');
    this.$tabButtonBar  = $('<div class="wcFrameButtonBar">');

    this.$tabBar.append(this.$tabScroll);
    this.$tabBar.append(this.$tabButtonBar);
    this.$frame.append(this.$buttonBar);
    this.$buttonBar.append(this.$close);
    this.$buttonBar.append(this.$collapse);
    this.$frame.append(this.$center);

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
    data.tabOrientation = this._tabOrientation;
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
    this._tabOrientation = data.tabOrientation || wcDocker.TAB.TOP;
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

    var getOffset = function($item) {
      switch (this._tabOrientation) {
        case wcDocker.TAB.BOTTOM:
          return $item.offset().left;
        case wcDocker.TAB.TOP:
          return $item.offset().left;
        case wcDocker.TAB.LEFT:
          return $item.offset().top;
        case wcDocker.TAB.RIGHT:
          return $item.offset().top;
      }
    }.bind(this);

    var visibilityChanged = [];
    var tabPositions = [];
    var totalWidth = 0;
    var parentLeft = getOffset(this.$tabScroll);
    var showTabs = this._panelList.length > 1 || this._isFloating || this.isCollapser();
    var self = this;

    if (this.isCollapser()) {
      // this.$titleBar.addClass('wcNotMoveable');
      this.$tabBar.addClass('wcNotMoveable');
    } else {
      this.$titleBar.removeClass('wcNotMoveable');
      this.$tabBar.removeClass('wcNotMoveable');
    }

    this.$center.children('.wcPanelTabContent').each(function() {
      $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
    });

    this._titleVisible = true;
    this.$title.html('');

    // Determine if the title and tabs are visible based on the panels inside.
    for (var i = 0; i < this._panelList.length; ++i) {
      var panel = this._panelList[i];

      var $tab = null;
      if (showTabs) {
        $tab = panel.$title;
        panel.$title.attr('id', i);
        this.$tabScroll.append(panel.$title);
      }

      if (!panel.moveable()) {
        this.$titleBar.addClass('wcNotMoveable');
        this.$tabBar.addClass('wcNotMoveable');
      }

      if (!panel._titleVisible) {
        this._titleVisible = false;
      }

      var $tabContent = this.$center.children('.wcPanelTabContent[id="' + i + '"]');
      if (!$tabContent.length) {
        $tabContent = $('<div class="wcPanelTabContent wcPanelTabContentHidden" id="' + i + '">');
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
        $tab && $tab.addClass('wcPanelTabActive');
        $tabContent.removeClass('wcPanelTabContentHidden');
        this.$title.html(panel.title());
        if (panel.$icon) {
          var $icon = panel.$icon.clone();
          this.$title.prepend($icon);
        }
      }

      if ($tab) {
        totalWidth = getOffset($tab) - parentLeft;
        tabPositions.push(totalWidth);

        totalWidth += $tab.outerWidth();
      }
    }

    var $topBar = this.$titleBar;
    var tabWidth = 0;
    if (this._titleVisible) {
      if (!this.$frame.parent()) {
        this.$center.css('top', '');
      }
      switch (this._tabOrientation) {
        case wcDocker.TAB.TOP:
          this.$frame.prepend(this.$tabBar);
          this.$titleBar.remove();
          this.$tabBar.addClass('wcTabTop').removeClass('wcTabLeft wcTabRight wcTabBottom');
          // this.$tabBar.css('margin-top', '');
          if (showTabs) {
            this.$title.remove();
          } else {
            this.$tabBar.prepend(this.$title);
          }
          $topBar = this.$tabBar;
          this.$center.css('left', 0).css('right', 0).css('bottom', 0);
          tabWidth = this.$center.width();
          break;
        case wcDocker.TAB.BOTTOM:
          this.$frame.prepend(this.$titleBar);
          this.$titleBar.append(this.$title);

          if (showTabs) {
            var titleSize = this.$titleBar.height();
            this.$frame.append(this.$tabBar);
            this.$tabBar.addClass('wcTabBottom').removeClass('wcTabTop wcTabLeft wcTabRight');
            // this.$tabBar.css('margin-top', '');

            this.$center.css('left', 0).css('right', 0).css('bottom', titleSize);
          } else {
            this.$tabBar.remove();
          }
          tabWidth = this.$center.width();
          break;

        case wcDocker.TAB.LEFT:
          this.$frame.prepend(this.$titleBar);
          this.$titleBar.append(this.$title);

          if (showTabs) {
            var titleSize = this.$titleBar.height();
            this.$frame.append(this.$tabBar);
            this.$tabBar.addClass('wcTabLeft').removeClass('wcTabTop wcTabRight wcTabBottom');
            // this.$tabBar.css('margin-top', titleSize);

            this.$center.css('left', titleSize).css('right', 0).css('bottom', 0);
          } else {
            this.$tabBar.remove();
          }
          tabWidth = this.$center.height();
          break;

        case wcDocker.TAB.RIGHT:
          this.$frame.prepend(this.$titleBar);
          this.$titleBar.append(this.$title);

          if (showTabs) {
            var titleSize = this.$titleBar.height();
            this.$frame.append(this.$tabBar);
            this.$tabBar.addClass('wcTabRight').removeClass('wcTabTop wcTabLeft wcTabBottom');
            // this.$tabBar.css('margin-top', titleSize);

            this.$center.css('left', 0).css('right', titleSize).css('bottom', 0);
          } else {
            this.$tabBar.remove();
          }
          tabWidth = this.$center.height();
          break;
      }
      if (!showTabs) {
        this.$center.css('left', 0).css('right', 0).css('bottom', 0);
      }
    } else {
      this.$titleBar.remove();
      this.$tabBar.remove();
      this.$center.css('top', 0).css('left', 0).css('right', 0).css('bottom', 0);
    }

    // Now remove all unused panel tabs.
    this.$center.children('.wcPanelTabUnused').each(function() {
      $(this).remove();
    });

    if (this._titleVisible) {
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
            var titleWidth = tabWidth - buttonSize;

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
      if (totalWidth > tabWidth - buttonSize) {
        this._canScrollTabs = this._titleVisible;
        if (this._canScrollTabs) {
          this.$tabButtonBar.append(this.$tabRight);
          this.$tabButtonBar.append(this.$tabLeft);
          buttonSize += this.$tabRight.outerWidth();
          buttonSize += this.$tabLeft.outerWidth();
        }

        var scrollLimit = totalWidth - (tabWidth - buttonSize)/2;
        // If we are beyond our scroll limit, clamp it.
        if (this._tabScrollPos > scrollLimit) {
          var children = this.$tabScroll.children();
          for (var i = 0; i < children.length; ++i) {
            var $tab = $(children[i]);

            totalWidth = getOffset($tab) - parentLeft;
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
    var tabButtonSize = 0;
    var panel = this.panel();

    this.$tabLeft.remove();
    this.$tabRight.remove();
    this.$close.hide();
    this.$collapse.hide();

    while (this._buttonList.length) {
      this._buttonList.pop().remove();
    }

    if (panel) {
      var scrollable = panel.scrollable();
      this.$center.toggleClass('wcScrollableX', scrollable.x);
      this.$center.toggleClass('wcScrollableY', scrollable.y);
      this.$frame.toggleClass('wcOverflowVisible', panel.overflowVisible());
      this.$center.toggleClass('wcOverflowVisible', panel.overflowVisible());

      if (!this.isCollapser() || this.isExpanded()) {
        if (panel.closeable()) {
          this.$close.show();
          buttonSize += this.$close.outerWidth();
        }

        var docker = this.docker();
        if (docker.isCollapseEnabled() && panel.moveable() && panel.collapsible() && !this._isFloating && !panel._isPlaceholder) {
          if (this.isCollapser()) {
            // Un-collapse
            var $icon = this.$collapse.children('div');
            $icon[0].className = 'fa fa-sign-out';
            switch (this._parent._position) {
              case wcDocker.DOCK.LEFT:
                $icon.addClass('wcCollapseLeft');
                break;
              case wcDocker.DOCK.RIGHT:
                $icon.addClass('wcCollapseRight');
                break;
              case wcDocker.DOCK.BOTTOM:
                $icon.addClass('wcCollapseBottom');
                break;
            }
            $icon.addClass('wcCollapsed');
            this.$collapse.show();
            this.$collapse.attr('title', 'Dock this collapsed panel back into the main layout.');
            buttonSize += this.$collapse.outerWidth();
          } else {
            // Collapse
            // Determine the direction to collapse based on the frame center.
            var $inner = docker.$container;
            if (!$.isEmptyObject(docker._collapser) && docker._collapser.hasOwnProperty(wcDocker.DOCK.RIGHT)) {
              // Get the inner contents element not taken up by the collapsible drawers.
              $inner = docker._collapser[wcDocker.DOCK.RIGHT]._parent.$pane[0];
            }

            var outer = $inner.offset();
            var center = this.$container.offset();
            center.right  = (center.left + this.$container.width() - outer.left) / $inner.width();
            center.bottom = (center.top + this.$container.height() - outer.top) / $inner.height();
            center.top    = (center.top - outer.top) / $inner.height();
            center.left   = (center.left - outer.left) / $inner.width();

            var direction = '';
            var directionClass = '';
            if (center.top > 0.5 && center.bottom > 0.95) {
              direction = 'bottom.';
              directionClass = 'wcCollapseBottom';
            } else if (center.left <= 0.05) {
              direction = 'left side.';
              directionClass = 'wcCollapseLeft';
            } else if (center.right >= 0.95) {
              direction = 'right side.';
              directionClass = 'wcCollapseRight';
            } else if (center.bottom > 0.95) {
              direction = 'bottom.';
              directionClass = 'wcCollapseBottom';
            }

            if (direction) {
              var $icon = this.$collapse.children('div');
              $icon[0].className = 'fa fa-sign-in';
              $icon.addClass(directionClass);
              $icon.addClass('wcCollapsible');
              this.$collapse.show();
              this.$collapse.attr('title', 'Collapse this panel into the ' + direction);
              buttonSize += this.$collapse.outerWidth();
            }
          }
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
          this.$buttonBar.append($button);
          buttonSize += $button.outerWidth();
        }
      }

      if (this._canScrollTabs) {
        this.$tabButtonBar.append(this.$tabRight);
        this.$tabButtonBar.append(this.$tabLeft);

        tabButtonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
      }

      if (this._titleVisible) {
        this.$buttonBar.css('right', '');
        switch (this._tabOrientation) {
          case wcDocker.TAB.RIGHT:
            this.$buttonBar.css('right', this.$tabBar.height());
          case wcDocker.TAB.LEFT:
            this.$tabBar.css('width', this.$center.height() + this.$tabBar.height());
            break;
          case wcDocker.TAB.TOP:
          case wcDocker.TAB.BOTTOM:
            this.$tabBar.css('width', this.$center.width());
            break;
          default:
            break;
        }
      }

      panel.__update();

      this.$center.scrollLeft(panel._scroll.x);
      this.$center.scrollTop(panel._scroll.y);
    }

    this.$buttonBar.css('min-width', buttonSize).css('width', buttonSize);
    this.$tabButtonBar.css('min-width', tabButtonSize).css('width', tabButtonSize);

    if (this._tabOrientation === wcDocker.TAB.TOP) {
      this.$tabButtonBar.css('right', buttonSize);
      return buttonSize + tabButtonSize;
    } else {
      this.$tabButtonBar.css('right', 0);
      return tabButtonSize;
    }
  },

  // Handles scroll notifications.
  __scrolled: function() {
    var panel = this.panel();
    panel._scroll.x = this.$center.scrollLeft();
    panel._scroll.y = this.$center.scrollTop();

    panel.__trigger(wcDocker.EVENT.SCROLLED);
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

      return this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
    }
    return false;
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  //    ghost     The ghost object.
  //    canSplit  Whether the frame can be split
  //    isTopper  Whether the user is dragging the topper (top title bar).
  __checkAnchorDrop: function(mouse, same, ghost, canSplit, isTopper) {
    var panel = this.panel();
    if (panel && panel.moveable()) {
      return panel.layout().__checkAnchorDrop(mouse, same && this._tabOrientation, ghost, (!this._isFloating && !this.isCollapser() && canSplit), this.$frame, panel.moveable() && panel.title(), isTopper, this.isCollapser()? this._tabOrientation: undefined);
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
    if (this.isCollapser()) {
      return this._parent.__rect();
    }

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
/**
 * @class
 * Splits an area in two, dividing it with a resize-able splitter bar. This is the same class
 * used throughout [docker]{@link wcDocker} to organize the docking interface, but it can also
 * be used inside a panel as a custom widget.
 * <b>Note:</b> The container needs to be positioned in either absolute or relative coordinates in css.
 *
 * @constructor
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this splitter.
 * @param {wcLayout|wcSplitter|wcDocker} parent   - The splitter's parent object.
 * @param {wcDocker.ORIENTATION} orientation      - The orientation of the splitter bar.
*/
function wcSplitter(container, parent, orientation) {
  this.$container = $(container);
  this._parent = parent;
  this._orientation = orientation;

  this._pane = [false, false];
  /**
   * An array of two elements representing each side of the splitter.
   * Index 0 is always either top or left depending on [orientation]{@link wcDocker.ORIENTATION}.
   * @member
   * @type {external:jQuery~Object[]}
   */
  this.$pane = [];
  this.$bar = null;
  this._pos = 0.5;
  this._posTarget = 0.5;
  this._pixelPos = -1;
  this._findBestPos = false;
  this._anim = 0;

  this._boundEvents = [];

  this.__init();

  this.docker()._splitterList.push(this);
};

/**
 * A callback function that is called when an action is finished.
 *
 * @callback wcSplitter~onFinished
 */

wcSplitter.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Initializes the two [panes]{@link wcSplitter#$pane} of the splitter with its own [layouts]{@link wcLayout}.
   * This should be used to initialize the splitter when creating one for use inside your panel.
   */
  initLayouts: function() {
    var layout0 = new wcLayout(this.$pane[0], this);
    var layout1 = new wcLayout(this.$pane[1], this);
    this.pane(0, layout0);
    this.pane(1, layout1);
  },

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Gets, or Sets the orientation of the splitter.
   *
   * @param {wcDocker.ORIENTATION} orientation - The new orientation of the splitter.
   */
  orientation: function(orientation) {
    if (typeof orientation === 'undefined') {
      return this._orientation;
    }

    if (this._orientation != orientation) {
      this._orientation = orientation;

      if (this._orientation) {
        // this.$pane[0].removeClass('wcWide').addClass('wcTall');
        // this.$pane[1].removeClass('wcWide').addClass('wcTall');
        this.$bar.removeClass('wcWide').removeClass('wcSplitterBarH').addClass('wcTall').addClass('wcSplitterBarV');
      } else {
        // this.$pane[0].removeClass('wcTall').addClass('wcWide');
        // this.$pane[1].removeClass('wcTall').addClass('wcWide');
        this.$bar.removeClass('wcTall').removeClass('wcSplitterBarV').addClass('wcWide').addClass('wcSplitterBarH');
      }

      this.$pane[0].css('top', '').css('left', '').css('width', '').css('height', '');
      this.$pane[1].css('top', '').css('left', '').css('width', '').css('height', '');
      this.$bar.css('top', '').css('left', '').css('width', '').css('height', '');
      this.__update();

      if (this._parent instanceof wcPanel) {
        this._parent.__trigger(wcDocker.EVENT.UPDATED);
      }
    }
  },

  /**
   * Gets the minimum size constraint of the outer splitter area.
   *
   * @returns {wcDocker~Size} The minimum size.
   */
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

  /**
   * Gets the maximum size constraint of the outer splitter area.
   *
   * @returns {wcDocker~Size} - The maximum size.
   */
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

  /**
   * Get, or Set the current splitter position.
   *
   * @param {Number} [value] - If supplied, assigns a new splitter position. Value must be a percentage value between 0 and 1.
   *
   * @returns {Number} - The current position.
   */
  pos: function(value) {
    if (typeof value !== 'undefined') {
      this._pos = this._posTarget = value;
      this.__update();

      if (this._parent instanceof wcPanel) {
        this._parent.__trigger(wcDocker.EVENT.UPDATED);
      }
    }

    return this._posTarget;
  },

  /**
   * Animates to a given splitter position.
   *
   * @param {Number} value - Assigns the target splitter position. Value must be a percentage between 0 and 1.
   * @param {wcSplitter~onFinished} - A finished event handler.
   */
  animPos: function(value, callback) {
    this._posTarget = value;
    var self = this;
    this.$bar.queue(function(next) {
      if (self._anim) {
        clearInterval(self._anim);
      }
      self._anim = setInterval(function() {
        if (self._pos > self._posTarget) {
          self._pos -= (self._pos - self._posTarget) / 5;
          if (self._pos <= self._posTarget + 0.01) {
            self._pos = self._posTarget;
          }
        }

        if (self._pos < self._posTarget) {
          self._pos += (self._posTarget - self._pos) / 5;
          if (self._pos >= self._posTarget - 0.01) {
            self._pos = self._posTarget;
          }
        }

        self.__update();
        if (self._pos == self._posTarget) {
          callback && callback();
          next();
          clearInterval(self._anim);
          self._anim = 0;
        }
      }, 5);
    });
    this.$bar.dequeue();
  },

  /**
   * Gets, or Sets the element associated with a pane.
   *
   * @param {Number} index - The index of the pane, only 0 and 1 are valid.
   * @param {wcLayout|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
   *
   * @returns {wcLayout|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
   */
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
    // this.__update();
    return false;
  },

  /**
   * Gets, or Sets the element associated with the left side pane (for horizontal layouts).
   *
   * @param {wcLayout|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
   *
   * @returns {wcLayout|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
   */
  left: function(item) {
    return this.pane(0, item);
  },

  /**
   * Gets, or Sets the element associated with the right side pane (for horizontal layouts).
   *
   * @param {wcLayout|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
   *
   * @returns {wcLayout|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
   */
  right: function(item) {
    return this.pane(1, item);
  },

  /**
   * Gets, or Sets the element associated with the top pane (for vertical layouts).
   *
   * @param {wcLayout|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
   *
   * @returns {wcLayout|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
   */
  top: function(item) {
    return this.pane(0, item);
  },

  /**
   * Gets, or Sets the element associated with the bottom pane (for vertical layouts).
   *
   * @param {wcLayout|wcPanel|wcFrame|wcSplitter} [item] - If supplied, the pane will be replaced with this item.
   *
   * @returns {wcLayout|wcPanel|wcFrame|wcSplitter|Boolean} - The current object assigned to the pane, or false.
   */
  bottom: function(item) {
    return this.pane(1, item);
  },

  /**
   * Gets, or Sets whether a pane can be scrolled via scroll bars.
   * By default, scrolling is enabled in both directions.
   *
   * @param {Number} index - The index of the pane, only 0 and 1 are valid.
   * @param {Boolean} [x] - Whether to allow scrolling in the horizontal direction.
   * @param {Boolean} [y] - Whether to allow scrolling in the vertical direction.
   *
   * @returns {wcDocker~Scrollable} - The current scroll state for each direction.
   */
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

  /**
   * Destroys the splitter.
   *
   * @param {Boolean} [destroyPanes=true] - If true, both panes attached will be destroyed as well. Use false if you plan to continue using the objects assigned to each pane, or make sure to remove them first before destruction.
   */
  destroy: function(destroyPanes) {
    var docker = this.docker();
    if (docker) {
      var index = this.docker()._splitterList.indexOf(this);
      if (index > -1) {
        this.docker()._splitterList.splice(index, 1);
      }
    }

    if (destroyPanes === undefined || destroyPanes) {
      this.__destroy();
    } else {
      this.__container(null);
    }
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
      // this.$pane[0].addClass('wcTall');
      // this.$pane[1].addClass('wcTall');
      this.$bar.addClass('wcTall').addClass('wcSplitterBarV');
    } else {
      // this.$pane[0].addClass('wcWide');
      // this.$pane[1].addClass('wcWide');
      this.$bar.addClass('wcWide').addClass('wcSplitterBarH');
    }

    this.__container(this.$container);

    if (this._parent instanceof wcPanel) {
      this._boundEvents.push({event: wcDocker.EVENT.UPDATED, handler: this.__update.bind(this)});
      this._boundEvents.push({event: wcDocker.EVENT.CLOSED,  handler: this.destroy.bind(this)});

      for (var i = 0; i < this._boundEvents.length; ++i) {
        this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
      }
    }
  },

  // Updates the size of the splitter.
  __update: function(opt_dontMove) {
    var width = this.$container.outerWidth();
    var height = this.$container.outerHeight();

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

    this.$bar.toggleClass('wcSplitterBarStatic', this.__isStatic());

    if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
      var barSize = this.$bar.outerWidth() / 2;
      var barBorder = parseInt(this.$bar.css('border-top-width')) + parseInt(this.$bar.css('border-bottom-width'));
      if (opt_dontMove) {
        var offset = this._pixelPos - (this.$container.offset().left + parseInt(this.$container.css('border-left-width'))) - this.$bar.outerWidth()/2;
        this._pos = offset / (width - this.$bar.outerWidth());
      }

      this._pos = Math.min(Math.max(this._pos, 0), 1);
      var size = (width - this.$bar.outerWidth()) * this._pos + barSize;
      if (minSize) {
        size = Math.max(minSize.x, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.x, size);
      }

      var top = 0;
      var bottom = 0;
      if (this._parent instanceof wcCollapser) {
        var $outer = this.docker().$container;
        var $inner = this._parent.$container;

        top = $inner.offset().top - $outer.offset().top;
        bottom = ($outer.offset().top + $outer.outerHeight()) - ($inner.offset().top + $inner.outerHeight());
      }

      // Bar is top to bottom
      this.$bar.css('left', size-barSize);
      this.$bar.css('top', top);
      this.$bar.css('height', height-barBorder-bottom);
      this.$pane[0].css('width', size-barSize);
      this.$pane[0].css('left',  '0px');
      this.$pane[0].css('right', '');
      this.$pane[0].css('top', top);
      this.$pane[0].css('bottom', bottom);
      this.$pane[1].css('left',  '');
      this.$pane[1].css('right', '0px');
      this.$pane[1].css('width', width-size-barSize-parseInt(this.$container.css('border-left-width'))*2);
      this.$pane[1].css('top', top);
      this.$pane[1].css('bottom', bottom);

      this._pixelPos = this.$bar.offset().left + barSize;
    } else {
      var barSize = this.$bar.outerHeight() / 2;
      var barBorder = parseInt(this.$bar.css('border-left-width')) + parseInt(this.$bar.css('border-right-width'));
      if (opt_dontMove) {
        var offset = this._pixelPos - (this.$container.offset().top + parseInt(this.$container.css('border-top-width'))) - this.$bar.outerHeight()/2;
        this._pos = offset / (height - this.$bar.outerHeight());
      }

      this._pos = Math.min(Math.max(this._pos, 0), 1);
      var size = (height - this.$bar.outerHeight()) * this._pos + barSize;
      if (minSize) {
        size = Math.max(minSize.y, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.y, size);
      }

      var left = 0;
      var right = 0;
      if (this._parent instanceof wcCollapser) {
        var $outer = this.docker().$container;
        var $inner = this._parent.$container;

        left = $inner.offset().left - $outer.offset().left;
        right = ($outer.offset().left + $outer.outerWidth()) - ($inner.offset().left + $inner.outerWidth());
      }

      // Bar is left to right
      this.$bar.css('top', size-barSize);
      this.$bar.css('left', left);
      this.$bar.css('width', width-barBorder-bottom);
      this.$pane[0].css('height', size-barSize);
      this.$pane[0].css('top',    '0px');
      this.$pane[0].css('bottom', '');
      this.$pane[0].css('left', left);
      this.$pane[0].css('right', right);
      this.$pane[1].css('top',    '');
      this.$pane[1].css('bottom', '0px');
      this.$pane[1].css('height', height-size-barSize-parseInt(this.$container.css('border-top-width'))*2);
      this.$pane[1].css('left', left);
      this.$pane[1].css('right', right);

      this._pixelPos = this.$bar.offset().top + barSize;
    }

    if (opt_dontMove === undefined) {
      opt_dontMove = true;
    }
    this._pane[0] && this._pane[0].__update(opt_dontMove);
    this._pane[1] && this._pane[1].__update(opt_dontMove);
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    // If this is a collapser splitter, do not save it, skip to the children.
    if (this._pane[0] && this._pane[0] instanceof wcCollapser) {
      return this._pane[1].__save();
    }
    if (this._pane[1] && this._pane[1] instanceof wcCollapser) {
      return this._pane[0].__save();
    }

    var data = {};
    data.type       = 'wcSplitter';
    data.horizontal = this._orientation;
    data.isDrawer   = this.$bar.hasClass('wcDrawerSplitterBar');
    data.pane0      = this._pane[0]? this._pane[0].__save(): null;
    data.pane1      = this._pane[1]? this._pane[1].__save(): null;
    data.pos        = this._pos;
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._pos  = data.pos;
    if (data.isDrawer) {
      this.$bar.addClass('wcDrawerSplitterBar');
    }
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
    var offset = this.$container.offset();
    mouse.x -= offset.left;
    mouse.y -= offset.top;

    if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
      var width = this.$container.outerWidth() - this.$bar.outerWidth();
      mouse.x += 1 - parseInt(this.$container.css('border-left-width')) - (this.$bar.outerWidth()/2);
      this.pos(mouse.x / width);
    } else {
      var height = this.$container.outerHeight() - this.$bar.outerHeight();
      mouse.y += 1 - parseInt(this.$container.css('border-top-width')) - (this.$bar.outerHeight()/2);
      this.pos(mouse.y / height);
    }
  },

  // Gets the minimum position of the splitter divider.
  __minPos: function() {
    var width = this.$container.outerWidth();
    var height = this.$container.outerHeight();

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

    if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
      var barSize = this.$bar.outerWidth()/2;
      minSize.x += barSize;
      width -= barSize;
    } else {
      var barSize = this.$bar.outerHeight()/2;
      minSize.y += barSize;
      height -= barSize;
    }

    maxSize.x = width  - Math.min(maxSize.x, width);
    maxSize.y = height - Math.min(maxSize.y, height);

    minSize.x = Math.max(minSize.x, maxSize.x);
    minSize.y = Math.max(minSize.y, maxSize.y);

    return minSize;
  },

  // Gets the maximum position of the splitter divider.
  __maxPos: function() {
    var width = this.$container.outerWidth();
    var height = this.$container.outerHeight();

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

    if (this._orientation === wcDocker.ORIENTATION.HORIZONTAL) {
      var barSize = this.$bar.outerWidth()/2;
      maxSize.x += barSize;
      width -= barSize;
    } else {
      var barSize = this.$bar.outerHeight()/2;
      maxSize.y += barSize;
      height -= barSize;
    }

    minSize.x = width  - minSize.x;
    minSize.y = height - minSize.y;

    maxSize.x = Math.min(minSize.x, maxSize.x);
    maxSize.y = Math.min(minSize.y, maxSize.y);
    return maxSize;
  },

  // Retrieves whether the splitter is static (not moveable).
  __isStatic: function() {
    var attr = this._orientation === wcDocker.ORIENTATION.HORIZONTAL? 'x': 'y';
    for (var i = 0; i < 2; ++i) {
      if (this._pane[i] && this._pane[i].minSize && this._pane[i].maxSize &&
          this._pane[i].maxSize()[attr] - this._pane[i].minSize()[attr] === 0) {
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
    // Stop any animations.
    if (this._anim) {
      clearInterval(this._anim);
      this._anim = 0;
    }
    this.$bar.clearQueue();

    // Remove all registered events.
    while (this._boundEvents.length){
      this._parent.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.shift();
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

/**
 * @class
 * A collapsable container for carrying panels.<br>
 *
 * @version 3.0.0
 * @constructor
 * @description
 * <b><i>PRIVATE<i> - Handled internally by [docker]{@link wcDocker} and <u>should never be constructed by the user.</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this drawer.
 * @param {wcSplitter|wcDocker} parent  - The drawer's parent object.
 * @param {wcDocker.DOCK} position      - A docking position to place this drawer.
 */
/*
  A docker container for carrying its own arrangement of docked panels as a slide out drawer.
*/
function wcCollapser(container, parent, position) {
  this.$container   = $(container);
  this.$frame       = null;

  this._position    = position;
  this._parent      = parent;
  this._splitter    = null;
  this._drawer      = null;
  this._size        = 0;
  this._orientation = (this._position === wcDocker.DOCK.LEFT || this._position === wcDocker.DOCK.RIGHT)? wcDocker.ORIENTATION.HORIZONTAL: wcDocker.ORIENTATION.VERTICAL;

  this.__init();
}

wcCollapser.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Collapses the drawer to its respective side wall.
   */
  collapse: function(instant) {
    this._drawer.collapse();
  },

  /**
   * Expands the drawer.
   */
  expand: function() {
    this._drawer.expand();
  },

  /**
   * Gets whether the drawer is expanded.
   *
   * @returns {Boolean} - The current expanded state.
   */
  isExpanded: function() {
    return this._drawer.isExpanded();
  },

  /**
   * The minimum size constraint for the side bar area.
   *
   * @returns {wcDocker~Size} - The minimum size.
   */
  minSize: function() {
    return {x: this._size, y: this._size};
  },

  /**
   * The maximum size constraint for the side bar area.
   *
   * @returns {wcDocker~Size} - The maximum size.
   */
  maxSize: function() {
    var isHorizontal = (this._orientation === wcDocker.ORIENTATION.HORIZONTAL)? true: false;
    return {
      x: (isHorizontal?  this._size: Infinity),
      y: (!isHorizontal? this._size: Infinity)
    };
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
  __init: function() {
    this.$frame = $('<div class="wcCollapserFrame">');
    this.__container(this.$container);

    var docker = this.docker();
    this._splitter = new wcSplitter(docker.$container, this, this._orientation);
    this._drawer = new wcDrawer(docker.$transition, this._splitter, this._position);
    switch (this._position) {
      case wcDocker.DOCK.LEFT:
        this._splitter.pane(0, this._drawer);
        this._splitter.$pane[1].remove();
        this._splitter.$pane[0].addClass('wcDrawer');
        this._splitter.pos(0);
        break;
      case wcDocker.DOCK.RIGHT:
      case wcDocker.DOCK.BOTTOM:
        this._splitter.pane(1, this._drawer);
        this._splitter.$pane[0].remove();
        this._splitter.$pane[1].addClass('wcDrawer');
        this._splitter.pos(1);
        break;
    }

    this._parent.$bar.addClass('wcSplitterHidden');
  },

  // Updates the size of the collapser.
  __update: function(opt_dontMove) {
    this._splitter.__update();
    this.__adjustSize();
  },

  // Adjusts the size of the collapser based on css
  __adjustSize: function() {
    if (this._drawer._frame._panelList.length) {
      this._size = this._drawer._frame.$tabBar.outerHeight();
    } else {
      this._size = 0;
    }
  },

  // Retrieves the bounding rect for this collapser.
  __rect: function() {
    return this._drawer.__rect();
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.size   = this._size;
    data.drawer = this._drawer.__save();
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._size = data.size;
    this._drawer.__restore(data.drawer, docker);
    this.__adjustSize();
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
    if (this._splitter) {
      this._splitter.__destroy();
      this._splitter = null;
      this._frame = null;
    }

    this.__container(null);
    this._parent = null;
  },
}
/**
 * @class
 * A collapsable container for carrying panels.<br>
 *
 * @version 3.0.0
 * @constructor
 * @description
 * <b><i>PRIVATE<i> - Handled internally by [docker]{@link wcDocker} and <u>should never be constructed by the user.</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this drawer.
 * @param {wcSplitter|wcDocker} parent  - The drawer's parent object.
 * @param {wcDocker.DOCK} position      - A docking position to place this drawer.
 */
/*
  A docker container for carrying its own arrangement of docked panels as a slide out drawer.
*/
function wcDrawer(container, parent, position) {
  this.$container   = $(container);
  this.$frame       = null;

  this._position    = position;
  this._parent      = parent;
  this._frame       = null;
  this._closeSize   = 0;
  this._expanded    = false;
  this._sliding     = false;
  this._orientation = (this._position === wcDocker.DOCK.LEFT || this._position === wcDocker.DOCK.RIGHT)? wcDocker.ORIENTATION.HORIZONTAL: wcDocker.ORIENTATION.VERTICAL;

  this.__init();
}

wcDrawer.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Collapses the drawer to its respective side wall.
   */
  collapse: function(instant) {
    if (this._expanded) {
      // Collapse happens before the tab is de-selected, so record the
      // current size and assign it to the current panel.
      var panel = this._frame.panel();
      if (panel) {
        var size = this._parent.pos();
        if (this._position !== wcDocker.DOCK.LEFT) {
          size = 1.0 - size;
        }

        var max;
        if (this._position === wcDocker.DOCK.BOTTOM) {
          max = this.docker().$container.height();
          panel._size.y = size * max;
        } else {
          max = this.docker().$container.width();
          panel._size.x = size * max;
        }
      }

      this._expanded = false;
      if (instant) {
        switch (this._position) {
          case wcDocker.DOCK.TOP:
          case wcDocker.DOCK.LEFT:
            this._parent.pos(0);
            break;
          case wcDocker.DOCK.RIGHT:
          case wcDocker.DOCK.BOTTOM:
            this._parent.pos(1);
            break;
        }
      } else {
        this._sliding = true;

        var self = this;
        var fin = function() {
          self._sliding = false;
          self._parent.__update();
        }

        switch (this._position) {
          case wcDocker.DOCK.TOP:
          case wcDocker.DOCK.LEFT:
            this._parent.animPos(0, fin);
            break;
          case wcDocker.DOCK.RIGHT:
          case wcDocker.DOCK.BOTTOM:
            this._parent.animPos(1, fin);
            break;
        }
      }
    }
  },

  /**
   * Expands the drawer.
   */
  expand: function() {
    if (!this._expanded) {
      this._expanded = true;
      this._sliding = true;

      var panel = this._frame.panel();
      if (panel) {
        // Determine the size to expand the drawer based on the size of the panel.
        var size, max;
        if (this._position === wcDocker.DOCK.BOTTOM) {
          size = panel._size.y;
          max = this.docker().$container.height();
        } else {
          size = panel._size.x;
          max = this.docker().$container.width();
        }

        if (this._position !== wcDocker.DOCK.LEFT) {
          size = max - size;
        }

        size = size / max;
        var self = this;
        this._parent.animPos(size, function() {
          self._sliding = false;
          self._parent.__update();
        });
      }
    }
  },

  /**
   * Gets whether the drawer is expanded.
   *
   * @returns {Boolean} - The current expanded state.
   */
  isExpanded: function() {
    return this._expanded;
  },

  /**
   * The minimum size constraint for the drawer area.
   *
   * @returns {wcDocker~Size} - The minimum size.
   */
  minSize: function() {
    if (this._expanded) {
      if (this._root && typeof this._root.minSize === 'function') {
        return this._root.minSize();
      } else {
        return {x: 100, y: 100};
      }
    }
    this.__adjustCollapsedSize();
    return {x: this._closeSize, y: this._closeSize};
  },

  /**
   * The maximum size constraint for the drawer area.
   *
   * @returns {wcDocker~Size} - The maximum size.
   */
  maxSize: function() {
    var isHorizontal = (this._orientation === wcDocker.ORIENTATION.HORIZONTAL)? true: false;
    if (this._expanded || this._sliding) {
      if (this._root && typeof this._root.maxSize === 'function') {
        return {
          x: (isHorizontal?  this._root.maxSize().x: Infinity),
          y: (!isHorizontal? this._root.maxSize().y: Infinity)
        };
      } else {
        return {x: Infinity, y: Infinity};
      }
    }
    this.__adjustCollapsedSize();
    return {
      x: (isHorizontal?  this._closeSize: Infinity),
      y: (!isHorizontal? this._closeSize: Infinity)
    };
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
  __init: function() {
    this.$frame = $('<div class="wcCollapserFrame">');
    this.__container(this.$container);

    this._frame = new wcFrame(this.$frame, this, false);
    this._frame.tabOrientation(this._position);
  },

  // Updates the size of the collapser.
  __update: function(opt_dontMove) {
    this.__adjustCollapsedSize();
    this._frame.__update();
  },

  // Adjusts the size of the collapser when it is closed.
  __adjustCollapsedSize: function() {
    if (this._frame._panelList.length) {
      this._closeSize = this._frame.$tabBar.outerHeight();
      this._parent.$bar.removeClass('wcSplitterHidden');
    } else {
      this._closeSize = 0;
      this._parent.$bar.addClass('wcSplitterHidden');
    }
  },

  // Retrieves the bounding rect for this collapser.
  __rect: function() {
    var offset = this.$frame.offset();
    var width = this.$frame.width();
    var height = this.$frame.height();

    var panel = this._frame.panel();
    if (panel) {
      // Determine the size to expand the drawer based on the size of the panel.
      if (this._position === wcDocker.DOCK.BOTTOM) {
        height = panel._size.y;
        width = width / 3;
      } else {
        width = panel._size.x;
        height = height / 3;
      }
    }

    return {
      x: offset.left,
      y: offset.top,
      w: width,
      h: height,
    };
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.closeSize  = this._closeSize;
    data.frame      = this._frame.__save();
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._closeSize = data.closeSize;
    this._frame.__restore(data.frame, docker);
    this.__adjustCollapsedSize();
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
    if (this._frame) {
      this._frame.__destroy();
      this._frame = null;
    }

    this.__container(null);
    this._parent = null;
  },
}
/**
 * @class
 * A tab widget container, useable inside a panel to break up multiple elements into separate tabbed pages.
 *
 * @constructor
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcPanel} parent - The parent panel object for this widget.
 */
function wcTabFrame(container, parent) {
  /**
   * The outer container element of the widget.
   *
   * @member {external:jQuery~Object}
   */
  this.$container = $(container);
  this._parent = parent;

  this.$frame     = null;
  this.$tabBar    = null;
  this.$tabScroll = null;
  this.$center    = null;
  this.$tabLeft   = null;
  this.$tabRight  = null;
  this.$close     = null;

  this._tabOrientation = wcDocker.TAB.TOP;
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

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Destroys the widget.
   */
  destroy: function() {
    this.__destroy();
  },

  /**
   * Gets, or Sets the tab orientation for the frame. This puts the tabbed widgets visually on any side of the tab frame.
   * @version 3.0.0
   *
   * @param {wcDocker.TAB} [orientation] - Assigns the orientation of the tab items displayed.
   *
   * @returns {wcDocker.TAB} - The current orientation.
   */
  tabOrientation: function(orientation) {
    if (orientation !== undefined) {
      if (this._tabOrientation !== orientation && this.docker()._canOrientTabs) {
        this._tabOrientation = orientation;

        this.__updateTabs();
        this.__updateTabs();
      }
    }

    return this._tabOrientation
  },

  /**
   * Adds a new tabbed page into the widget.
   *
   * @param {String} name    - The name of the new tab page.
   * @param {Number} [index] - If supplied, will insert the new tab page at the given tab index.
   *
   * @returns {wcLayout} - The layout of the newly created tab page.
   */
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

  /**
   * Removes a tab page from the widget.
   *
   * @param {Number} index - The tab page index to remove.
   *
   * @returns {Boolean} - Success or failure.
   */
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
      this._parent.__trigger(wcDocker.EVENT.CUSTOM_TAB_CLOSED, {obj: this, name: name, index: index});
      return true;
    }
    return false;
  },

  /**
   * Gets, or Sets the currently visible tab page.
   *
   * @param {Number} index - If supplied, sets the current tab page index.
   *
   * @returns {Number} - The index of the currently visible tab page.
   */
  tab: function(index, autoFocus) {
    if (typeof index !== 'undefined') {
      if (index > -1 && index < this._layoutList.length) {
        this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        this._curTab = index;
        this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + index + '"]').addClass('wcPanelTabActive');
        this.$center.children('.wcPanelTabContent[id="' + index + '"]').removeClass('wcPanelTabContentHidden');
        this.__updateTabs(autoFocus);

        var name = this._layoutList[this._curTab].name;
        this._parent.__trigger(wcDocker.EVENT.CUSTOM_TAB_CHANGED, {obj: this, name: name, index: index});
      }
    }

    return this._curTab;
  },

  /**
   * Retrieves the layout for a given tab page.
   *
   * @param {Number} index - The tab page index to retrieve.
   *
   * @returns {wcLayout|Boolean} - The layout of the found tab page, or false.
   */
  layout: function(index) {
    if (index > -1 && index < this._layoutList.length) {
      return this._layoutList[index];
    }
    return false;
  },

  /**
   * Moves a tab page from a given index to another index.
   *
   * @param {Number} fromIndex - The current tab page index to move from.
   * @param {Number} toIndex   - The new tab page index to move to.
   *
   * @returns {external:jQuery~Object} - The new element of the moved tab, or false if an error occurred.
   */
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

      return this.$tabBar.find('> .wcTabScroller > .wcPanelTab[id="' + toIndex + '"]')[0];
    }
    return false;
  },

  /**
   * Gets, or Sets whether the tabs can be reordered by the user.
   *
   * @param {Boolean} [moveable] - If supplied, assigns whether tab pages can be reordered.
   *
   * @returns {Boolean} - Whether tab pages are currently moveable.
   */
  moveable: function(moveable) {
    if (typeof moveable !== 'undefined') {
      this._moveable = moveable;
    }
    return this._moveable;
  },

  /**
   * Gets, or Sets whether a tab can be closed (removed) by the user.
   *
   * @param {Number} index        - The index of the tab page.
   * @param {Boolean} [closeable] - If supplied, assigns whether the tab page can be closed.
   *
   * @returns {Boolean} - Whether the tab page can be closed.
   */
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

  /**
   * Gets, or Sets whether a tab page area is scrollable.
   *
   * @param {Number} index  - The index of the tab page.
   * @param {Boolean} [x]   - If supplied, assigns whether the tab page is scrollable in the horizontal direction.
   * @param {Boolean} [y]   - If supplied, assigns whether the tab page is scrollable in the vertical direction.
   *
   * @returns {wcDocker~Scrollable} - The current scrollable status of the tab page.
   */
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

  /**
   * Gets, or Sets whether overflow on a tab area is visible.
   * Use this if a child element within this panel is intended to 'popup' and be visible outside of its parent area.
   *
   * @param {Number} index        - The index of the tab page.
   * @param {Boolean} [visible]   - If supplied, assigns whether overflow is visible.
   *
   * @returns {Boolean} - The current overflow visiblity status of the tab page.
   */
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

  /**
   * Sets the icon for a tab item.
   *
   * @param {Number} index  - The index of the tab item.
   * @param {String} icon   - A CSS class name that represents the icon.
   */
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

  /**
   * Sets the icon for a tab item using the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
   *
   * @param {Number} index  - The index of the tab item.
   * @param {String} icon   - A [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} icon name (without the 'fa fa-' prefix).
   */
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


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this.$frame     = $('<div class="wcCustomTab wcWide wcTall">');
    this.$tabBar    = $('<div class="wcFrameTitleBar wcCustomTabTitle wcWide">');
    this.$tabScroll = $('<div class="wcTabScroller">');
    this.$center    = $('<div class="wcFrameCenter wcPanelBackground">');
    this.$tabLeft   = $('<div class="wcFrameButton" title="Scroll tabs to the left."><span class="fa fa-arrow-left"></span>&lt;</div>');
    this.$tabRight  = $('<div class="wcFrameButton" title="Scroll tabs to the right."><span class="fa fa-arrow-right"></span>&gt;</div>');
    this.$close     = $('<div class="wcFrameButton" title="Close the currently active panel tab"><span class="fa fa-close"></span>X</div>');
    this.$buttonBar = $('<div class="wcFrameButtonBar">');

    this.$tabBar.append(this.$tabScroll);
    this.$tabBar.append(this.$buttonBar);
    this.$buttonBar.append(this.$close);
    this.$frame.append(this.$center);
    this.$frame.append(this.$tabBar);

    this.__container(this.$container);

    this._boundEvents.push({event: wcDocker.EVENT.UPDATED, handler: this.update.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.CLOSED,  handler: this.destroy.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._parent.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }

    var docker = this.docker();
    if (docker) {
      docker._tabList.push(this);
    }
  },

  // Updates the size of the frame.
  update: function() {
    this.__updateTabs();
  },

  __updateTabs: function(autoFocus) {
    this.$tabScroll.empty();

    var getOffset = function($item) {
      switch (this._tabOrientation) {
        case wcDocker.TAB.BOTTOM:
          return $item.offset().left;
        case wcDocker.TAB.TOP:
          return $item.offset().left;
        case wcDocker.TAB.LEFT:
          return $item.offset().top;
        case wcDocker.TAB.RIGHT:
          return $item.offset().top;
      }
    }.bind(this);

    var tabPositions = [];
    var totalWidth = 0;
    var parentLeft = getOffset(this.$tabScroll);
    var self = this;

    this.$center.children('.wcPanelTabContent').each(function() {
      $(this).addClass('wcPanelTabContentHidden wcPanelTabUnused');
    });

    for (var i = 0; i < this._layoutList.length; ++i) {
      var $tab = $('<div id="' + i + '" class="wcPanelTab"><div>' + this._layoutList[i].name + '</div></div>');
      if (this._moveable) {
        $tab.addClass('wcCustomTabMoveable');
      }
      this.$tabScroll.append($tab);
      if (this._layoutList[i].$icon) {
        $tab.find('div').prepend(this._layoutList[i].$icon);
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

      totalWidth = getOffset($tab) - parentLeft;
      tabPositions.push(totalWidth);

      totalWidth += $tab.outerWidth();
    }

    var tabWidth = 0;
    var titleSize = this.$tabBar.height();
    switch (this._tabOrientation) {
      case wcDocker.TAB.TOP:
        this.$tabBar.addClass('wcTabTop').removeClass('wcTabLeft wcTabRight wcTabBottom');
        this.$center.css('top', titleSize).css('left', 0).css('right', 0).css('bottom', 0);
        tabWidth = this.$center.width();
        break;
      case wcDocker.TAB.BOTTOM:
        this.$tabBar.addClass('wcTabBottom').removeClass('wcTabTop wcTabLeft wcTabRight');
        this.$center.css('top', 0).css('left', 0).css('right', 0).css('bottom', titleSize);
        tabWidth = this.$center.width();
        break;

      case wcDocker.TAB.LEFT:
        this.$tabBar.addClass('wcTabLeft').removeClass('wcTabTop wcTabRight wcTabBottom');
        this.$center.css('top', 0).css('left', titleSize).css('right', 0).css('bottom', 0);
        tabWidth = this.$center.height();
        break;

      case wcDocker.TAB.RIGHT:
        this.$tabBar.addClass('wcTabRight').removeClass('wcTabTop wcTabLeft wcTabBottom');
        this.$center.css('top', 0).css('left', 0).css('right', titleSize).css('bottom', 0);
        tabWidth = this.$center.height();
        break;
    }

    // Now remove all unused panel tabs.
    this.$center.children('.wcPanelTabUnused').each(function() {
      $(this).remove();
    });

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
          var titleWidth = tabWidth - buttonSize;

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
    if (totalWidth > tabWidth - buttonSize) {
      this._canScrollTabs = true;
      this.$buttonBar.append(this.$tabRight);
      this.$buttonBar.append(this.$tabLeft);
      buttonSize += this.$tabRight.outerWidth();
      buttonSize += this.$tabLeft.outerWidth();

      var scrollLimit = totalWidth - (tabWidth - buttonSize)/2;
      // If we are beyond our scroll limit, clamp it.
      if (this._tabScrollPos > scrollLimit) {
        var children = this.$tabScroll.children();
        for (var i = 0; i < children.length; ++i) {
          var $tab = $(children[i]);

          totalWidth = getOffset($tab) - parentLeft;
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
        this.$close.show();
        buttonSize += this.$close.outerWidth();
      } else {
        this.$close.hide();
      }

      if (this._canScrollTabs) {
        this.$tabBar.append(this.$tabRight);
        this.$tabBar.append(this.$tabLeft);

        buttonSize += this.$tabRight.outerWidth() + this.$tabLeft.outerWidth();
      }

      switch (this._tabOrientation) {
        case wcDocker.TAB.RIGHT:
        case wcDocker.TAB.LEFT:
          this.$tabBar.css('width', this.$center.height());
          break;
        case wcDocker.TAB.TOP:
        case wcDocker.TAB.BOTTOM:
          this.$tabBar.css('width', this.$center.width());
        default:
          break;
      }

      this.$center.scrollLeft(layout._scroll.x);
      this.$center.scrollTop(layout._scroll.y);
    }

    this.$buttonBar.css('min-width', buttonSize).css('width', buttonSize);
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
      this._boundEvents.shift();
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
/**
 * @class
 * The wcIFrame widget makes it easier to include an iFrame element into your panel.
 * Because an iFrame's contents is cleared whenever it is moved in the DOM heirarchy
 * (and changing a panels docking position causes DOM movement), special care must
 * be taken when using them.<br><br>
 *
 * This will create an iFrame element and place it in a static (non-changing) DOM
 * location. It will then sync its size and position to match the container area of
 * this wcIFrame widget. It works rather well, but has its limitations. Since the
 * iFrame is essentially on top of the window, it can not be only partially hidden.
 * If the wcIFrame container is partially hidden outside the bounds of the panel,
 * the iFrame will not be hidden.
 * {@tutorial 3.0-widgets}
 *
 * @constructor
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcLayout|wcSplitter|wcDocker} parent   - The layout's parent object.
 */
function wcIFrame(container, panel) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$container = $(container);
  this.$frame = null;
  this.$focus = null;

  /**
   * The iFrame element.
   * @member {external:jQuery~Object}
   */
  this.$iFrame = null;

  this._window = null;
  this._isDocking = false;
  this._isHovering = false;

  this._boundEvents = [];

  this._onLoadFuncs = [];

  this.__init();
};

wcIFrame.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._panel;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Opens a given URL address into the iFrame.
   *
   * @param {String} url - The full, or relative, path to the page.
   */
  openURL: function(url) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();
    this._window.location.replace(url);

    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));

    var self = this;
    this.$iFrame.load(function() {
      for (var i = 0; i < self._onLoadFuncs.length; ++i) {
        self._onLoadFuncs[i]();
      }
      self._onLoadFuncs = [];
    });
  },

  /**
   * Populates the iFrame with the given HTML source code using the document to write data.
   *
   * @param {String} html - The HTML source code.
   */
  openHTML: function(html) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();

    // Write the frame source.
    this._window.document.open();
    this._window.document.write(html);
    this._window.document.close();

    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));

    var self = this;
    this.$iFrame.load(function() {
      for (var i = 0; i < self._onLoadFuncs.length; ++i) {
        self._onLoadFuncs[i]();
      }
      self._onLoadFuncs = [];
    });
  },

  /**
   * Populates the iFrame with the given HTML source code using the srcdoc attribute.
   * @version 3.0.0
   *
   * @param {String} html - The HTML source code.
   */
  openSRC: function(html) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();

    // Write the frame source.
    this.$iFrame[0].srcdoc = html;
    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));

    var self = this;
    this.$iFrame.load(function() {
      for (var i = 0; i < self._onLoadFuncs.length; ++i) {
        self._onLoadFuncs[i]();
      }
      self._onLoadFuncs = [];
    });
  },

  /**
   * Registers an event handler when the contents of this iFrame has loaded.
   * @param {Function} onLoadedFunc - A function to call when the iFrame has loaded.
   */
  onLoaded: function(onLoadedFunc) {
    this._onLoadFuncs.push(onLoadedFunc);
  },

  /**
   * Allows the iFrame to be visible when the panel is visible.
   */
  show: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameHidden');
    }
  },

  /**
   * Forces the iFrame to be hidden, regardless of whether the panel is visible.
   */
  hide: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameHidden');
    }
  },

  /**
   * Retrieves the window object from the iFrame element.
   *
   * @returns {Object} - The window object.
   */
  window: function() {
    return this._window;
  },

  /**
   * Destroys the iFrame element and clears all references.<br>
   * <b>Note:</b> This is automatically called when the owner panel is destroyed.
   */
  destroy: function() {
    // Remove all registered events.
    while (this._boundEvents.length){
      this._panel.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.shift();
    }

    this.__clearFrame();
    this._panel = null;
    this._layout = null;
    this.$container = null;
    this.$frame.remove();
    this.$frame = null;
    this.$focus = null;
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  __init: function() {
    this.$frame = $('<div class="wcIFrame">');
    this.$focus = $('<div class="wcIFrameFocus">');
    this._panel.docker().$container.append(this.$frame);
    this.$frame.append(this.$focus);

    this._boundEvents.push({event: wcDocker.EVENT.VISIBILITY_CHANGED, handler: this.__onVisibilityChanged.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.BEGIN_DOCK,         handler: this.__onBeginDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.END_DOCK,           handler: this.__onEndDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVE_STARTED,       handler: this.__onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZE_STARTED,     handler: this.__onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVE_ENDED,         handler: this.__onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZE_ENDED,       handler: this.__onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVED,              handler: this.__onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZED,            handler: this.__onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.ATTACHED,           handler: this.__updateFrame.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.DETACHED,           handler: this.__updateFrame.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.GAIN_FOCUS,         handler: this.__updateFrame.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.LOST_FOCUS,         handler: this.__updateFrame.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.CLOSED,             handler: this.__onClosed.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._panel.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }

    $(window).blur(this.__onBlur.bind(this));
    this.$focus.mousedown(this.__onFocus.bind(this));
    // this.__updateFrame();
  },

  __clearFrame: function() {
    if (this.$iFrame) {
      this.$iFrame[0].srcdoc = '';
      this.$iFrame.remove();
      this.$iFrame = null;
      this._window = null;
    }
  },

  __updateFrame: function() {
    if (this.$frame && this._panel) {
      var floating = this._panel.isFloating();
      this.$frame.toggleClass('wcIFrameFloating', floating);
      if (floating) {
        var focus = this._panel.isInFocus();
        this.$frame.toggleClass('wcIFrameFloatingFocus', focus);
        if (focus) {
          this.$focus.hide();
        } else {
          this.$focus.show();
        }
      } else {
        this.$frame.removeClass('wcIFrameFloatingFocus');
      }
      this.$frame.toggleClass('wcIFramePanelHidden', !this._panel.isVisible());
      if (this._panel._parent instanceof wcFrame) {
        this.$frame.toggleClass('wcDrawer', this._panel._parent.isCollapser());
      }
    }
  },

  __focusFix: function() {
    // Fixes a bug where the frame stops responding to mouse wheel after
    // it has been assigned and unassigned pointer-events: none in css.
    this.$frame.css('left', parseInt(this.$frame.css('left'))+1);
    this.$frame.css('left', parseInt(this.$frame.css('left'))-1);
  },

  __onHoverEnter: function() {
    this._isHovering = true;
  },

  __onHoverExit: function() {
    this._isHovering = false;
  },

  __onBlur: function() {
    if (this._isHovering) {
      this.__onFocus();
    }
  },

  __onFocus: function() {
    this.docker().__focus(this._panel._parent);
  },

  __onVisibilityChanged: function() {
    this.__updateFrame();
  },

  __onBeginDock: function() {
    if (this.$frame) {
      this._isDocking = true;
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  __onEndDock: function() {
    if (this.$frame) {
      this._isDocking = false;
      this.$frame.removeClass('wcIFrameMoving');
      this.__focusFix();
    }
  },

  __onMoveStarted: function() {
    if (this.$frame && !this._isDocking) {
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  __onMoveFinished: function() {
    if (this.$frame && !this._isDocking) {
      this.$frame.removeClass('wcIFrameMoving');
      this.__focusFix();
    }
  },

  __onMoved: function() {
    if (this.$frame && this._panel) {
      // Size, position, and show the frame once the move is finished.
      var dockerPos = this.docker().$container.offset();
      var pos = this.$container.offset();
      var width = this.$container.width();
      var height = this.$container.height();

      this.$frame.css('top', pos.top - dockerPos.top);
      this.$frame.css('left', pos.left - dockerPos.left);
      this.$frame.css('width', width);
      this.$frame.css('height', height);
    }
  },

  __onClosed: function() {
    this.destroy();
  },
};
