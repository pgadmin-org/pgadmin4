/*
 * https://github.com/naresh-n/slickgrid-column-data-autosize
 */

(function($) {

  $.extend(true, window, {
    'Slick': {
      'AutoColumnSize': AutoColumnSize,
    },
  });

  function AutoColumnSize(maxWidth) {

    var grid, $container, context,
      keyCodes = {
        'A': 65,
      };

    function init(_grid) {
      grid = _grid;
      maxWidth = maxWidth || 200;

      $container = $(grid.getContainerNode());
      $container.on('dblclick.autosize', '.slick-resizable-handle', reSizeColumn);
      $container.keydown(handleControlKeys);

      context = document.createElement('canvas').getContext('2d');
    }

    function destroy() {
      $container.off();
    }

    function handleControlKeys(event) {
      if (event.ctrlKey && event.shiftKey && event.keyCode === keyCodes.A) {
        resizeAllColumns();
      }
    }

    function resizeAllColumns() {
      var elHeaders = $container.find('.slick-header-column');
      var allColumns = grid.getColumns();
      elHeaders.each(function(index, el) {
        var columnDef = $(el).data('column');
        var headerWidth = getElementWidth(el);
        var colIndex = grid.getColumnIndex(columnDef.id);
        var column = allColumns[colIndex];
        var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, colIndex)) + 1;
        autoSizeWidth = Math.min(maxWidth, autoSizeWidth);
        column.width = autoSizeWidth;
      });
      grid.setColumns(allColumns);
      grid.onColumnsResized.notify();
    }

    function reSizeColumn(e) {
      var headerEl = $(e.currentTarget).closest('.slick-header-column');
      var columnDef = headerEl.data('column');

      if (!columnDef || !columnDef.resizable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      var headerWidth = getElementWidth(headerEl[0]);
      var colIndex = grid.getColumnIndex(columnDef.id);
      var allColumns = grid.getColumns();
      var column = allColumns[colIndex];

      var autoSizeWidth = Math.max(headerWidth, getMaxColumnTextWidth(columnDef, colIndex)) + 1;

      if (autoSizeWidth !== column.width) {
        column.width = autoSizeWidth;
        grid.setColumns(allColumns);
        grid.onColumnsResized.notify();
      }
    }

    function getMaxColumnTextWidth(columnDef, colIndex) {
      var texts = [];
      var rowEl = createRow();
      var data = grid.getData();
      if (window.Slick.Data && data instanceof window.Slick.Data.DataView) {
        data = data.getItems();
      }
      for (var i = 0; i < data.length; i++) {
        texts.push(data[i][columnDef.field]);
      }
      var template = getMaxTextTemplate(texts, columnDef, colIndex, data, rowEl);
      var width = getTemplateWidth(rowEl, template);
      deleteRow(rowEl);
      return width;
    }

    function getTemplateWidth(rowEl, template) {
      var cell = $(rowEl.find('.slick-cell'));
      cell.append(template);
      cell.find('*').css('position', 'relative');
      return cell.outerWidth() + 1;
    }

    function getMaxTextTemplate(texts, columnDef, colIndex, data, rowEl) {
      var max = 0,
        maxTemplate = null;
      var formatFun = columnDef.formatter;
      $(texts).each(function(index, text) {
        var template;
        if (formatFun) {
          template = $('<span>' + formatFun(index, colIndex, text, columnDef, data[index]) + '</span>');
          text = template.text() || text;
        }
        var length = text ? getElementWidthUsingCanvas(rowEl, text) : 0;
        if (length > max) {
          max = length;
          maxTemplate = template || text;
        }
      });
      return maxTemplate;
    }

    function createRow() {
      var rowEl = $('<div class="slick-row"><div class="slick-cell"></div></div>');
      rowEl.find('.slick-cell').css({
        'visibility': 'hidden',
        'text-overflow': 'initial',
        'white-space': 'nowrap',
      });
      var gridCanvas = $container.find('.grid-canvas').first();
      $(gridCanvas).append(rowEl);
      return rowEl;
    }

    function deleteRow(rowEl) {
      $(rowEl).remove();
    }

    function getElementWidth(element) {
      var width, clone = element.cloneNode(true);
      clone.style.cssText = 'position: absolute; visibility: hidden;right: auto;text-overflow: initial;white-space: nowrap;';
      element.parentNode.insertBefore(clone, element);
      width = clone.offsetWidth;
      clone.parentNode.removeChild(clone);
      return width;
    }

    function getElementWidthUsingCanvas(element, text) {
      context.font = element.css('font-size') + ' ' + element.css('font-family');
      var metrics = context.measureText(text);
      return metrics.width;
    }

    return {
      init: init,
      destroy: destroy,
    };
  }
}(window.jQuery));
