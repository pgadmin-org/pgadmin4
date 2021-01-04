//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import 'slickgrid.plugins/slick.cellrangeselector';
import XCellSelectionModel from 'sources/selection/xcell_selection_model';
import 'slickgrid.grid';
import Slick from 'slickgrid';
import $ from 'jquery';

describe('XCellSelectionModel', function () {
  var KEY_RIGHT = 39;
  var KEY_LEFT = 37;
  var KEY_UP = 38;
  var KEY_DOWN = 40;

  var container, grid;
  var SlickGrid = Slick.Grid;
  var oldWindowParent = window.parent;

  beforeEach(function () {
    window.parent = window;

    var columns = [{
      id: 'row-header-column',
      name: 'row header column name',
      selectable: false,
    }, {
      id: '1',
      name: 'some-column-name',
      field: 'some-column-name',
      pos: 0,
    }, {
      id: 'second-column-id',
      name: 'second column',
      field: 'second column',
      pos: 1,
    }, {
      id: 'third-column-id',
      name: 'third column',
      field: 'third column',
      pos: 2,
    },
    ];

    var data = [];
    for (var i = 0; i < 10; i++) {
      data.push({
        'some-column-name': 'some-value-' + i,
        'second column': 'second value ' + i,
        'third column': 'third value ' + i,
        'fourth column': 'fourth value ' + i,
        '__temp_PK': '123' + i,
      });
    }
    container = $('<div></div>');
    var dataView = new Slick.Data.DataView();
    container.height(9999);
    container.width(9999);
    dataView.setItems(data, '__temp_PK');
    grid = new SlickGrid(container, dataView, columns);
    grid.setSelectionModel(new XCellSelectionModel());
    $('body').append(container);
  });

  afterEach(function () {
    grid.destroy();
    container.remove();
    window.parent = oldWindowParent;
  });

  describe('handleKeyDown', function () {
    describe('when we press a random key', function () {
      it('should not change the range', function () {
        var range = new Slick.Range(1, 2);
        grid.setActiveCell(1, 2);
        grid.getSelectionModel().setSelectedRanges([range]);
        pressKey(72);

        expect(grid.getSelectionModel().getSelectedRanges()[0]).toEqual(range);
      });
    });

    describe('when we press an arrow key ', function () {
      it('should select the cell to the right', function () {
        var range = new Slick.Range(1, 2);
        grid.setActiveCell(1, 2);
        grid.getSelectionModel().setSelectedRanges([range]);
        pressKey(KEY_RIGHT);

        expectOneSelectedRange(1, 3, 1, 3);
      });
    });

    describe('when we press shift', function () {
      describe('and we press an arrow key', function () {
        var scrollColumnIntoViewSpy, scrollRowIntoViewSpy;

        beforeEach(function () {
          scrollColumnIntoViewSpy = spyOn(grid, 'scrollColumnIntoView');
          scrollRowIntoViewSpy = spyOn(grid, 'scrollRowIntoView');
        });

        describe('the right arrow', function () {
          describe('when a cell is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(1, 1);
              grid.setActiveCell(1, 1);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_RIGHT);
            });

            it('increases the range by one to the right', function () {
              expectOneSelectedRange(1, 1, 1, 2);
            });

            it('should scroll the next column into view', function () {
              expect(scrollColumnIntoViewSpy).toHaveBeenCalledWith(2);
              expect(scrollRowIntoViewSpy).not.toHaveBeenCalled();
            });

            it('pressing right again grows the range right', function () {
              pressShiftPlusKey(KEY_RIGHT);

              expectOneSelectedRange(1, 1, 1, 3);
            });

            it('then pressing left keeps the original selection', function () {
              pressShiftPlusKey(KEY_LEFT);

              expectOneSelectedRange(1, 1, 1, 1);
            });
          });

          describe('when a column is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(0, 1, 9, 1);
              grid.setActiveCell(0, 1);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_RIGHT);
            });

            it('increases the range by one column to the right', function () {
              expectOneSelectedRange(0, 1, 9, 2);
            });

            it('should scroll the next column into view', function () {
              expect(scrollColumnIntoViewSpy).toHaveBeenCalledWith(2);
              expect(scrollRowIntoViewSpy).not.toHaveBeenCalled();
            });
          });
        });

        describe('the left arrow', function () {
          describe('when a cell is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(1, 3);
              grid.setActiveCell(1, 3);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_LEFT);
            });

            it('increases the range by one to the left', function () {
              expectOneSelectedRange(1, 2, 1, 3);
            });

            it('should scroll previous column into view', function () {
              expect(scrollColumnIntoViewSpy).toHaveBeenCalledWith(2);
              expect(scrollRowIntoViewSpy).not.toHaveBeenCalled();
            });

            it('pressing left again grows the range the left', function () {
              pressShiftPlusKey(KEY_LEFT);

              expectOneSelectedRange(1, 1, 1, 3);
            });

            it('then pressing right keeps the original selection', function () {
              pressShiftPlusKey(KEY_RIGHT);

              expectOneSelectedRange(1, 3, 1, 3);
            });
          });

          describe('when a column is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(0, 2, 9, 2);
              grid.setActiveCell(0, 2);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_LEFT);
            });

            it('increases the range by one column to the left', function () {
              expectOneSelectedRange(0, 1, 9, 2);
            });

            it('should scroll previous column into view', function () {
              expect(scrollColumnIntoViewSpy).toHaveBeenCalledWith(1);
              expect(scrollRowIntoViewSpy).not.toHaveBeenCalled();
            });
          });
        });

        describe('the up arrow', function () {
          describe('when a cell is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(2, 2);
              grid.setActiveCell(2, 2);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_UP);
            });

            it('increases the range by one up', function () {
              expectOneSelectedRange(1, 2, 2, 2);
            });

            it('should scroll the row above into view', function () {
              expect(scrollRowIntoViewSpy).toHaveBeenCalledWith(1);
              expect(scrollColumnIntoViewSpy).not.toHaveBeenCalled();
            });

            it('pressing up again grows the range up', function () {
              pressShiftPlusKey(KEY_UP);

              expectOneSelectedRange(0, 2, 2, 2);
            });

            it('then pressing down keeps the original selection', function () {
              pressShiftPlusKey(KEY_DOWN);

              expectOneSelectedRange(2, 2, 2, 2);
            });
          });

          describe('when a row is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(2, 1, 2, 3);
              grid.setActiveCell(2, 1);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_UP);
            });

            it('increases the range by one row up', function () {
              expectOneSelectedRange(1, 1, 2, 3);
            });

            it('should scroll the row above into view', function () {
              expect(scrollRowIntoViewSpy).toHaveBeenCalledWith(1);
              expect(scrollColumnIntoViewSpy).not.toHaveBeenCalled();
            });
          });
        });

        describe('the down arrow', function () {
          describe('when a cell is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(2, 2);
              grid.setActiveCell(2, 2);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_DOWN);
            });

            it('increases the range by one down', function () {
              expectOneSelectedRange(2, 2, 3, 2);
            });

            it('should scroll the row below into view', function () {
              expect(scrollRowIntoViewSpy).toHaveBeenCalledWith(3);
              expect(scrollColumnIntoViewSpy).not.toHaveBeenCalled();
            });

            it('pressing down again grows the range down', function () {
              pressShiftPlusKey(KEY_DOWN);

              expectOneSelectedRange(2, 2, 4, 2);
            });

            it('then pressing up keeps the original selection', function () {
              pressShiftPlusKey(KEY_UP);

              expectOneSelectedRange(2, 2, 2, 2);
            });
          });

          describe('when a row is selected', function () {
            beforeEach(function () {
              var range = new Slick.Range(2, 1, 2, 3);
              grid.setActiveCell(2, 1);
              grid.getSelectionModel().setSelectedRanges([range]);
              pressShiftPlusKey(KEY_DOWN);
            });

            it('increases the range by one row down', function () {
              expectOneSelectedRange(2, 1, 3, 3);
            });

            it('should scroll the row below into view', function () {
              expect(scrollRowIntoViewSpy).toHaveBeenCalledWith(3);
              expect(scrollColumnIntoViewSpy).not.toHaveBeenCalled();
            });
          });
        });

        describe('rectangular selection works', function () {

          it('in the down-and-rightward direction', function () {
            var range = new Slick.Range(1, 1);
            grid.setActiveCell(1, 1);
            grid.getSelectionModel().setSelectedRanges([range]);

            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_RIGHT);
            pressShiftPlusKey(KEY_RIGHT);

            expectOneSelectedRange(1, 1, 4, 3);
          });

          it('in the up-and-leftward direction', function () {
            var range = new Slick.Range(4, 3);
            grid.setActiveCell(4, 3);
            grid.getSelectionModel().setSelectedRanges([range]);

            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_LEFT);
            pressShiftPlusKey(KEY_LEFT);

            expectOneSelectedRange(1, 1, 4, 3);
          });

          it('in the up-and-rightward direction', function () {
            var range = new Slick.Range(4, 1);
            grid.setActiveCell(4, 1);
            grid.getSelectionModel().setSelectedRanges([range]);

            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_UP);
            pressShiftPlusKey(KEY_RIGHT);
            pressShiftPlusKey(KEY_RIGHT);

            expectOneSelectedRange(1, 1, 4, 3);
          });

          it('in the down-and-leftward direction', function () {
            var range = new Slick.Range(1, 3);
            grid.setActiveCell(1, 3);
            grid.getSelectionModel().setSelectedRanges([range]);

            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_DOWN);
            pressShiftPlusKey(KEY_LEFT);
            pressShiftPlusKey(KEY_LEFT);

            expectOneSelectedRange(1, 1, 4, 3);
          });
        });

        describe('and we are on an edge', function () {
          var range;

          beforeEach(function () {
            range = new Slick.Range(2, 1);
            grid.setActiveCell(2, 1);
            grid.getSelectionModel().setSelectedRanges([range]);
          });

          it('we still have the selected range before we arrowed', function () {
            pressShiftPlusKey(KEY_LEFT);
            expectOneSelectedRange(2, 1, 2, 1);
          });
        });
      });
    });
  });

  describe('when we drag and drop', function () {
    var dd;
    // We could not find an elegant way to calculate this value
    // after changing window size we saw this was a constant value
    var offsetLeftColumns = 100;

    function cellTopPosition($cell, rowNumber) {
      return $(grid.getCanvasNode()).offset().top + $cell[0].scrollHeight * rowNumber;
    }

    function cellLeftPosition(columnNumber) {
      return $(grid.getCanvasNode()).offset().left + offsetLeftColumns * columnNumber;
    }

    beforeEach(function () {
      var initialPosition = {cell: 3, row: 4};
      var $cell = $($('.slick-cell.l3')[initialPosition.row]);
      var event = {
        target: $cell,
        isPropagationStopped: jasmine.createSpy('isPropagationStopped').and.returnValue(false),
        isImmediatePropagationStopped: jasmine.createSpy('isImmediatePropagationStopped').and.returnValue(false),
        stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation'),
      };

      dd = {
        grid: grid,
        startX: cellLeftPosition(initialPosition.cell),
        startY: cellTopPosition($cell, initialPosition.row),
      };

      grid.onDragStart.notify(dd, event, grid);
    });

    describe('when the drop happens outside of the grid', function () {
      beforeEach(function () {
        var $cell = $($('.slick-cell.l1')[1]);
        var finalPosition = {cell: 1, row: 1};

        var event = {
          target: $cell,
          isPropagationStopped: jasmine.createSpy('isPropagationStopped').and.returnValue(false),
          isImmediatePropagationStopped: jasmine.createSpy('isImmediatePropagationStopped').and.returnValue(false),
          stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation'),

          pageX: cellLeftPosition(finalPosition.cell),
          pageY: cellTopPosition($cell, finalPosition.row),
        };

        grid.onDrag.notify(dd, event, grid);
        $(window).mouseup();
      });
      it('should call handleDragEnd from CellRangeSelector', function () {
        var newRange = grid.getSelectionModel().getSelectedRanges();

        expect(newRange.length).toEqual(1);

        expect(newRange[0].fromCell).toEqual(1);
        expect(newRange[0].toCell).toEqual(3);
        expect(newRange[0].fromRow).toEqual(1);
        expect(newRange[0].toRow).toEqual(4);
      });
    });
  });

  describe('when we mouse up and no drag and drop occured', function () {
    beforeEach(function () {
      grid.onDragEnd.notify = jasmine.createSpy('notify');
      grid.onDragEnd.notify.calls.reset();
      $(window).mouseup();
    });

    it('do not notify onDragEnd', function () {
      expect(grid.onDragEnd.notify).not.toHaveBeenCalled();
    });
  });

  describe('setSelectedRows', function () {

    beforeEach(function () {
      grid.getSelectionModel().setSelectedRanges(
        [new Slick.Range(1, 1, 1, 1)]
      );
    });

    describe('when passed an empty array', function () {
      beforeEach(function () {
        grid.getSelectionModel().setSelectedRows([]);
      });
      it('clears ranges', function () {
        var newRanges = grid.getSelectionModel().getSelectedRanges();
        expect(newRanges.length).toEqual(0);
      });
    });

    it('sets ranges corresponding to rows', function () {
      grid.getSelectionModel().setSelectedRows([0, 2]);

      var selectedRanges = grid.getSelectionModel().getSelectedRanges();

      expect(selectedRanges.length).toEqual(2);
      expectRangeToMatch(selectedRanges[0], 0, 1, 0, 3);
      expectRangeToMatch(selectedRanges[1], 2, 1, 2, 3);
    });
  });

  function pressKey(keyCode) {
    var pressEvent = new $.Event('keydown');
    pressEvent.which = keyCode;

    $(container.find('.grid-canvas')).trigger(pressEvent);
  }

  function pressShiftPlusKey(keyCode) {
    var pressEvent = new $.Event('keydown');
    pressEvent.shiftKey = true;
    pressEvent.which = keyCode;

    $(container.find('.grid-canvas')).trigger(pressEvent);
  }

  function expectOneSelectedRange(fromRow, fromCell, toRow, toCell) {
    var selectedRanges = grid.getSelectionModel().getSelectedRanges();
    expect(selectedRanges.length).toEqual(1);
    expectRangeToMatch(selectedRanges[0], fromRow, fromCell, toRow, toCell);
  }

  function expectRangeToMatch(range, fromRow, fromCell, toRow, toCell) {
    expect(range.fromRow).toEqual(fromRow);
    expect(range.toRow).toEqual(toRow);
    expect(range.fromCell).toEqual(fromCell);
    expect(range.toCell).toEqual(toCell);
  }
});
