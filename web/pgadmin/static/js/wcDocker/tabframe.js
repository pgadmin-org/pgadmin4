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