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