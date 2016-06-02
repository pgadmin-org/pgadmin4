/*
 backgrid-sizeable-columns
 https://github.com/FortesSolutions/backgrid-sizeable-columns

 Copyright (c) 2016 Fortes Solutions
 Licensed under the MIT @license.
 */
(function (root, factory) {
  // CommonJS
  if (typeof exports == "object") {
    module.exports = factory(require("underscore"), require("backgrid"));
  }
  // AMD. Register as an anonymous module.
  else if (typeof define === 'function' && define.amd) {
    define(['underscore', 'backgrid'], factory);
  }
  // Browser
  else {
    factory(root._, root.Backgrid);
  }

}(this, function (_, Backgrid) {
  "use strict";

  // Adds width support to columns
  Backgrid.Extension.SizeAbleColumns = Backbone.View.extend({
    /** @property */
    tagName: "colgroup",

    /**
     * Initializer
     * @param options
     */
    initialize: function (options) {
      this.grid = options.grid;

      // Attach event listeners once on render
      this.listenTo(this.grid.header, "backgrid:header:rendered", this.render);
      this.listenTo(this.grid.columns, "width:auto", this.setWidthAuto);
      this.listenTo(this.grid.columns, "width:fixed", this.setWidthFixed);
      this.listenTo(this.grid, "backgrid:refresh", this.setColToActualWidth);
      this.listenTo(this.grid.collection, "add remove reset", this.setColToActualWidth);
    },

    /**
     * Adds sizeable columns using <col> elements in a <colgroup>
     * @returns {Backgrid.Extension.SizeAbleColumns}
     */
    render: function () {
      var view = this;
      view.$el.empty();

      view.grid.columns.each(function (col) {
        if (typeof col.get("renderable") == "undefined" || col.get("renderable")) {
          var $colEl = $("<col>").appendTo(view.$el).attr("data-column-cid", col.cid);
          var colWidth = col.get("width");
          var colMinWidth = col.get("minWidth");
          var colMaxWidth = col.get("maxWidth");
          if (colWidth && colWidth != "*") {
            if (colMinWidth && colWidth < colMinWidth) {
              colWidth = colMinWidth;
            }
            if (colMaxWidth && colWidth > colMaxWidth) {
              colWidth = colMaxWidth;
            }
            $colEl.width(colWidth);
          }
        }
      });

      // Add data attribute to column cells
      if (view.grid.header.headerRows) {
        _.each(view.grid.header.headerRows, function(row) {
          _.each(row.cells, function(cell) {
            cell.$el.attr("data-column-cid", cell.column.cid);
          });
        });
      }
      else {
        _.each(view.grid.header.row.cells, function(cell) {
          cell.$el.attr("data-column-cid", cell.column.cid);
        });
      }

      // Trigger event
      view.grid.collection.trigger("backgrid:colgroup:changed");
      return this;
    },

    /**
     * Gets a <col> element belonging to given model
     * @param colModel Backgrid.Column
     * @returns {*|JQuery|any|jQuery}
     * @private
     */
    getColumnElement: function (colModel) {
      return this.$el.find('col[data-column-cid="' + colModel.cid + '"]');
    },

    /**
     * Get the column width of given model
     * @param colModel Backgrid.Column
     * @returns {Integer}
     * @private
     */
    getHeaderElementWidth: function(colModel) {
      return this.grid.header.$el.find("th[data-column-cid='" + colModel.cid + "']").outerWidth();
    },

    /**
     * Sets a width of the given column to "*" (auto)
     * @param colModel Backgrid.Column
     * @private
     */
    setWidthAuto: function (colModel) {
      // Get column element
      var $colElement = this.getColumnElement(colModel);

      // Save width
      colModel.set("width", "*");

      // Set column width to auto
      $colElement.css("width", "");

      this.grid.collection.trigger("backgrid:colgroup:updated");
    },

    /**
     * Sets a width of the given column to a fixed width defined in the model.
     * @param colModel Backgrid.Column
     * @private
     */
    setWidthFixed: function (colModel) {
      // Get column element
      var $colElement = this.getColumnElement(colModel);

      // Get width of header element
      var width = this.getHeaderElementWidth(colModel);

      // Set column width to the original width
      $colElement.css("width", width);

      // Save width
      colModel.set("width", width);

      this.grid.collection.trigger("backgrid:colgroup:updated");
    },

    /**
     * Updates the view's <col> elements to current width
     * @private
     */
    setColToActualWidth: function() {
      var view = this;
      var changed = false;
      _.each(view.grid.header.row.cells, function(cell) {
        var $colEl = view.getColumnElement(cell.column);
        if (cell.column.get("width") !== "*") {
          changed = changed || $colEl.width() == cell.$el.outerWidth();
          $colEl.width(cell.$el.outerWidth());
        }
      });

      if (changed) {
        view.grid.collection.trigger("backgrid:colgroup:updated");
      }
    }
  });

  // Makes column resizable; requires Backgrid.Extension.sizeAbleColumns
  Backgrid.Extension.SizeAbleColumnsHandlers = Backbone.View.extend({
    minWidthDynamicColumns: 80,

    /**
     * Initializer
     * @param options
     */
    initialize: function (options) {
      this.sizeAbleColumns = options.sizeAbleColumns;
      this.grid = this.sizeAbleColumns.grid;
      this.columns = this.grid.columns;
      this.header = this.grid.header;

      this.saveColumnWidth = options.saveColumnWidth;
      if (options.minWidthDynamicColumns != null) {
        this.minWidthDynamicColumns = options.minWidthDynamicColumns;
      }

      this.setHeaderElements();
      this.attachEvents();

      this.checkSpacerColumn();
    },

    /**
     * Adds handlers to resize the columns
     * @returns {Backgrid.Extension.SizeAbleColumnsHandlers}
     */
    render: function () {
      var view = this;
      view.$el.empty();

      // For now, loop tds in first row
      _.each(view.headerElements, function (columnEl, index) {
        // Get matching col element
        var $column = $(columnEl);
        var columnModelCid = $column.data("column-cid");
        var $col = view.sizeAbleColumns.$el.find("col[data-column-cid=" + columnModelCid + "]");
        var columnModel = view.columns.get({ cid: columnModelCid});

        if (columnModel && columnModel.get("resizeable")) {
          // Create helper elements
          var $resizeHandler = $("<div></div>")
            .addClass("resizeHandler")
            .attr("data-column-index", index)
            .appendTo(view.$el);
          var $resizeHandlerHelper = $("<div></div>")
            .hide()
            .addClass("grid-draggable-cursor")
            .appendTo($resizeHandler);

          // Make draggable
          $resizeHandler.on("mousedown", function (e) {
            view._stopEvent(e);
            var startX = Math.round($resizeHandler.offset().left);
            var $doc = $(document);
            var handlerNonDragSize = $resizeHandler.outerWidth();

            // Set class
            $resizeHandler.addClass("grid-draggable");
            $resizeHandlerHelper.show();

            // Follow the mouse
            var mouseMoveHandler = function (evt) {
              view._stopEvent(evt);

              // Check for constraints
              var minWidth = columnModel.get("minWidth");
              if (!minWidth || minWidth < 20) {
                minWidth = 20;
              }
              var maxWidth = columnModel.get("maxWidth");
              var newLeftPos = evt.pageX;
              var currentWidth = columnModel.get("width");
              var newWidth = currentWidth + (newLeftPos - startX) - handlerNonDragSize / 2;

              if (minWidth && newWidth <= minWidth) {
                newLeftPos = startX - (currentWidth - minWidth) + handlerNonDragSize / 2;
              }
              if (maxWidth && newWidth >= maxWidth) {
                newLeftPos = startX + maxWidth - currentWidth + handlerNonDragSize / 2;
              }

              // Apply mouse change to handler
              $resizeHandler.offset({
                left: newLeftPos
              });
            };
            $doc.on("mousemove", mouseMoveHandler);

            // Add handler to listen for mouseup
            var mouseUpHandler = function (evt) {
              // Cleanup
              view._stopEvent(evt);
              $resizeHandler.removeClass("grid-draggable");
              $resizeHandlerHelper.hide();
              $doc.off("mouseup", mouseUpHandler);
              $doc.off("mousemove", mouseMoveHandler);

              // Adjust column size
              var stopX = Math.round($resizeHandler.offset().left);
              var offset = (startX - stopX);
              var oldWidth = $column.outerWidth();
              var newWidth = oldWidth - offset;

              // Save width and trigger events
              if (newWidth != oldWidth) {
                view._disableAutoWithColumns();
                $col.width(newWidth);

                if (view.saveColumnWidth) {
                  // Save updated width
                  columnModel.set("width", newWidth, {silent: true});
                }

                // Trigger event
                columnModel.trigger("resize", columnModel, newWidth, oldWidth, offset);
              }
              view.updateHandlerPosition();
            };
            $doc.on("mouseup", mouseUpHandler);
          });
        }
      });

      // Position drag handlers
      view.updateHandlerPosition();

      return this;
    },

    /**
     * Disable automatic width for all columns and set the current width as the new width
     * @returns {undefined}
     */
    _disableAutoWithColumns: function () {
      // Check if we have an autosize column, if so, trigger resize on it as well
      var autoWidthColumns = this.columns.filter(function (column) {
        return column.get('width') == '*' && column.get('name') != '__spacerColumn';
      });

      for (var i = 0; i < autoWidthColumns.length; i++) {
        var autoWidthColumn = autoWidthColumns[i];

        // find the corresponding header element to determine width and cid from
        var $headerElement;
        for (var j = 0; j < this.headerElements.length; j++) {
          $headerElement = $(this.headerElements[j]);
          if ($headerElement.hasClass(autoWidthColumn.get('name'))) {
            break;
          }
        }

        var outerWidth = $headerElement.outerWidth();
        var columnModelCid = $headerElement.data("column-cid");
        this.sizeAbleColumns.$el.find("col[data-column-cid=" + columnModelCid + "]").width(outerWidth);

        var column = this.columns.get({ cid: columnModelCid});
        if (this.saveColumnWidth) {
          column.set('width', outerWidth, {silent: true});
        }
        column.trigger('resize', column, outerWidth);
      }
    },

    /**
     * Helper function to prevent event propagation
     * @param e {Event}
     * @private
     */
    _stopEvent: function (e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.cancelBubble = true;
      e.returnValue = false;
    },

    /**
     * Add listeners
     * @private
     */
    attachEvents: function () {
      var view = this;
      view.listenTo(view.columns, "change:resizeable", view.render);
      view.listenTo(view.columns, "resize width:auto width:fixed add remove", view.checkSpacerColumn);
      view.listenTo(view.grid.collection, "backgrid:colgroup:updated", view.updateHandlerPosition);
      view.listenTo(view.grid.collection, "backgrid:colgroup:changed", function () {
        // Wait for callstack to be cleared
        _.defer(function () {
          view.setHeaderElements();
          view.render();
        });
      });

      this.resizeEvtHandler = _.debounce(_.bind(view.updateHandlerPosition, view), 250);
      $(window).on("resize", this.resizeEvtHandler);
    },

    /**
     * Checks whether a spacer column is nessecary. This is the case when widths are set on all columns and it's smaller
     * that the grid element width.
     * @private
     */
    checkSpacerColumn: function () {
      var view = this;
      var spacerColumn = _.first(view.columns.where({name: "__spacerColumn"}));
      var autoColumns = view.columns.filter(function (col) {
        return col.get("width") == "*" && col.get("name") != "__spacerColumn";
      });

      // Check if there is a column with auto width, if so, no need to do anything
      if (_.isEmpty(autoColumns)) {
        var totalWidth = view.columns.reduce(function (memo, num) {
          // count 0 pixels for the spacer column
          var colWidth = (num.get("width") == "*") ? 0 : num.get("width");
          return memo + colWidth;
        }, 0);
        var gridWidth = view.grid.$el.width();

        if (gridWidth > totalWidth) {
          // The grid is larger than the cumulative column width, we need a spacer column
          if (!spacerColumn) {
            // Create new column model
            view.columns.add(view.getSpacerColumn(), {silent: true});
          }
        }
      }
      else {
        if (spacerColumn) {
          view.columns.remove(spacerColumn, {silent: true});
        }

        var columnsWidth = this.columns.reduce(function (memo, column) {
          return memo + (column.get('width') == '*' ? this.minWidthDynamicColumns : column.get('width'));
        }, 0, this);
        // min width on columns does not work, therefore place the min width on the table itself
        this.grid.$el.css('min-width', columnsWidth + 'px');
      }
    },

    /**
     * Returns a spacer column definition
     * @returns Object
     * @private
     */
    getSpacerColumn: function() {
      return Backgrid.Extension.SizeAbleColumns.spacerColumnDefinition;
    },

    /**
     * Updates the position of the handlers
     * @private
     */
    updateHandlerPosition: function () {
      var view = this;
      _.each(view.headerElements, function (columnEl, index) {
        var $column = $(columnEl);

        // Get handler for current column and update position
        view.$el.children().filter("[data-column-index='" + index + "']")
          .css("left", $column.position().left + $column.outerWidth());
      });
    },

    /**
     * Find the current header elements and stores them
     */
    setHeaderElements: function () {
      var self = this;
      var rows = self.grid.header.headerRows || [self.grid.header.row];
      self.headerCells = [];

      // Loop all rows
      _.each(rows, function (row) {
        // Loop cells of row
        _.each(row.cells, function (cell) {
          var columnModel = self.columns.get({cid: cell.column.cid});
          if (!_.isEmpty(columnModel)) {
            self.headerCells.push({
              $el: cell.$el,
              el: cell.el,
              column: columnModel
            });
          }
        });
      });

      // Sort cells
      var headerCells = _.sortBy(self.headerCells, function (cell) {
        return self.columns.indexOf(cell.column);
      });

      // Filter cells
      self.headerCells = _.filter(headerCells, function(cell) {
        return cell.column.get("renderable") === true ||
          typeof cell.column.get("renderable") === "undefined";
      });

      self.headerElements = _.map(self.headerCells, function (cell) {
        return cell.el;
      });
    },

    remove: function() {
      $(window).off("resize", this.resizeEvtHandler);
      Backbone.View.prototype.remove.call(this);
    }
  });

  /**
   * Sample definition for the spacer column
   */
  Backgrid.Extension.SizeAbleColumns.spacerColumnDefinition = {
    name: "__spacerColumn",
    label: "",
    editable: false,
    cell: Backgrid.StringCell,
    width: "*",
    nesting: [],
    resizeable: false,
    sortable: false,
    orderable: false,
    displayOrder: 9999
  };
  return Backgrid;
}));

