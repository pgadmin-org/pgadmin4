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