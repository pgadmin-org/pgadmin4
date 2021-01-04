//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define([
  'sources/selection/active_cell_capture',
  'sources/selection/range_selection_helper',
], function (ActiveCellCapture, RangeSelectionHelper) {
  describe('ActiveCellCapture', function () {
    var grid, activeCellPlugin, getSelectedRangesSpy, setSelectedRangesSpy;
    var onHeaderClickFunction;
    var onClickFunction;
    var onColumnsResizedFunction;
    var onHeaderMouseEnterFunction;
    var onHeaderMouseLeaveFunction;
    var Slick = window.Slick;

    beforeEach(function () {
      getSelectedRangesSpy = jasmine.createSpy('getSelectedRangesSpy');
      setSelectedRangesSpy = jasmine.createSpy('setSelectedRangesSpy');
      grid = {
        getSelectionModel: function () {
          return {
            getSelectedRanges: getSelectedRangesSpy,
            setSelectedRanges: setSelectedRangesSpy,
          };
        },

        getColumns: function () {
          return [
            {id: 'row-header-column'},
            {id: 'column-1'},
            {id: 'column-2'},
          ];
        },

        onDragEnd: jasmine.createSpyObj('onDragEnd', ['subscribe']),
        onActiveCellChanged: jasmine.createSpyObj('onActiveCellChanged', ['subscribe']),
        onHeaderClick: jasmine.createSpy('onHeaderClick'),
        onClick: jasmine.createSpy('onClick'),
        onKeyDown: jasmine.createSpyObj('onKeyDown', ['subscribe']),
        onColumnsResized: jasmine.createSpyObj('onColumnsResized', ['subscribe']),
        onHeaderMouseEnter: jasmine.createSpyObj('onHeaderMouseEnter', ['subscribe']),
        onHeaderMouseLeave: jasmine.createSpyObj('onHeaderMouseLeave', ['subscribe']),

        getDataLength: function () { return 10; },

        setActiveCell: jasmine.createSpy('setActiveCell'),
        getActiveCell: jasmine.createSpy('getActiveCell'),
        resetActiveCell: jasmine.createSpy('resetActiveCell'),
      };
      activeCellPlugin = new ActiveCellCapture();

      grid.onHeaderClick.subscribe =
        jasmine.createSpy('subscribe').and.callFake(function (callback) {
          onHeaderClickFunction = callback.bind(activeCellPlugin);
        });

      grid.onClick.subscribe =
        jasmine.createSpy('subscribe').and.callFake(function (callback) {
          onClickFunction = callback.bind(activeCellPlugin);
        });

      grid.onColumnsResized.subscribe =
        jasmine.createSpy('subscribe').and.callFake(function (callback) {
          onColumnsResizedFunction = callback.bind(activeCellPlugin);
        });

      grid.onHeaderMouseEnter.subscribe =
        jasmine.createSpy('subscribe').and.callFake(function (callback) {
          onHeaderMouseEnterFunction = callback.bind(activeCellPlugin);
        });

      grid.onHeaderMouseLeave.subscribe =
        jasmine.createSpy('subscribe').and.callFake(function (callback) {
          onHeaderMouseLeaveFunction = callback.bind(activeCellPlugin);
        });

      activeCellPlugin.init(grid);
    });

    describe('onHeaderClickHandler', function () {
      describe('when no ranges are selected', function () {
        beforeEach(function () {
          getSelectedRangesSpy.and.returnValue([]);
          onHeaderClickFunction({}, {column: {pos: 1}});
          grid.getActiveCell.and.returnValue(null);
        });

        it('should set the active cell', function () {
          expect(grid.setActiveCell).toHaveBeenCalledWith(0, 2);
        });

        it('should not change the selected ranges', function () {
          expect(setSelectedRangesSpy).not.toHaveBeenCalled();
        });
      });

      describe('when only one column is already selected', function () {
        beforeEach(function () {
          getSelectedRangesSpy.and.returnValue([RangeSelectionHelper.rangeForColumn(grid, 2)]);
          grid.getActiveCell.and.returnValue({cell: 2, row: 0});
        });

        describe('when a different column is clicked', function () {
          beforeEach(function () {
            onHeaderClickFunction({}, {column: {pos: 4}});
          });

          it('should set the active cell to the newly clicked columns top cell', function () {
            expect(grid.setActiveCell).toHaveBeenCalledWith(0, 5);
          });
        });

        describe('when the same column is clicked', function () {
          beforeEach(function () {
            onHeaderClickFunction({}, {column: {pos: 1}});
          });

          it('should reset the active cell', function () {
            expect(grid.resetActiveCell).toHaveBeenCalled();
          });
        });

        describe('when mouse is inside the header row', function () {
          beforeEach(function () {
            onHeaderMouseEnterFunction({}, {});
          });

          describe('when user finishes resizing the selected column', function () {
            var eventSpy;

            beforeEach(function () {
              eventSpy = jasmine.createSpyObj('event', ['stopPropagation']);
              onColumnsResizedFunction({}, {grid: grid});
              onHeaderClickFunction(eventSpy, {column: {pos: 1}});
            });

            it('should not deselect the current selected column', function () {
              expect(grid.setActiveCell).not.toHaveBeenCalled();
              expect(grid.resetActiveCell).not.toHaveBeenCalled();
            });

            it('should prevent further event propagation', function () {
              expect(eventSpy.stopPropagation).toHaveBeenCalled();
            });

            describe('when the user clicks the resized column header', function () {
              beforeEach(function () {
                eventSpy.stopPropagation.calls.reset();
                onHeaderClickFunction(eventSpy, {column: {pos: 2}});
              });

              it('should change the active cell', function () {
                expect(grid.setActiveCell).toHaveBeenCalledWith(0, 3);
                expect(grid.resetActiveCell).not.toHaveBeenCalled();
              });

              it('should allow further event propagation', function () {
                expect(eventSpy.stopPropagation).not.toHaveBeenCalled();
              });
            });
          });
        });

        describe('when mouse is outside the header row', function () {
          beforeEach(function () {
            onHeaderMouseEnterFunction({}, {});
            onHeaderMouseLeaveFunction({}, {});
          });

          describe('when user finishes resizing the selected column', function () {
            beforeEach(function () {
              onColumnsResizedFunction({}, {grid: grid});
            });

            it('should not deselect the current selected column', function () {
              expect(grid.setActiveCell).not.toHaveBeenCalled();
              expect(grid.resetActiveCell).not.toHaveBeenCalled();
            });

            describe('when the user clicks another column header', function () {
              var eventSpy;

              beforeEach(function () {
                eventSpy = jasmine.createSpyObj('event', ['stopPropagation']);
                onHeaderMouseEnterFunction({}, {});
                onHeaderClickFunction(eventSpy, {column: {pos: 3}});
              });

              it('should change the active cell', function () {
                expect(grid.setActiveCell).toHaveBeenCalledWith(0, 4);
                expect(grid.resetActiveCell).not.toHaveBeenCalled();
              });

              it('should allow further event propagation', function () {
                expect(eventSpy.stopPropagation).not.toHaveBeenCalled();
              });
            });
          });
        });
      });

      describe('when three non-consecutive columns are selected', function () {
        beforeEach(function () {
          getSelectedRangesSpy.and.returnValue([
            RangeSelectionHelper.rangeForColumn(grid, 10),
            RangeSelectionHelper.rangeForColumn(grid, 6),
            RangeSelectionHelper.rangeForColumn(grid, 22),
          ]);
          grid.getActiveCell.and.returnValue({cell: 22, row: 0});
        });

        describe('when the third column is clicked (thereby deselecting it)', function () {
          beforeEach(function () {
            onHeaderClickFunction({}, {column: {pos: 21}});
          });

          it('should set the active cell to the second column', function () {
            expect(grid.setActiveCell).toHaveBeenCalledWith(0, 6);
          });
        });

        describe('when the second column is clicked (thereby deselecting it)', function () {
          beforeEach(function () {
            onHeaderClickFunction({}, {column: {pos: 5}});
          });

          it('should not set the active cell', function () {
            expect(grid.setActiveCell).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('onClick', function () {
      describe('when the target is a random cell in the grid', function () {
        it('should not change the active cell', function () {
          onClickFunction({}, {row: 1, cell: 2});
          grid.getActiveCell.and.returnValue(null);

          expect(grid.setActiveCell).not.toHaveBeenCalled();
        });
      });

      describe('when the target is the row header', function () {
        describe('when no rows are selected', function () {
          beforeEach(function () {
            getSelectedRangesSpy.and.returnValue([]);
            onClickFunction({}, {row: 1, cell: 0});
            grid.getActiveCell.and.returnValue(null);
          });

          it('changes the active cell', function () {
            expect(grid.setActiveCell).toHaveBeenCalledWith(1, 1);
          });

          it('should not change the selected ranges', function () {
            expect(setSelectedRangesSpy).not.toHaveBeenCalled();
          });
        });

        describe('when there is one cell selected', function () {
          beforeEach(function () {
            grid.getActiveCell.and.returnValue({row: 4, cell: 5});
            getSelectedRangesSpy.and.returnValue([
              new Slick.Range(4, 5),
            ]);
          });

          it('sets the active cell', function () {
            onClickFunction({}, {row: 4, cell: 0});

            expect(grid.setActiveCell).toHaveBeenCalledWith(4, 1);
          });
        });

        describe('when there is one row selected', function () {
          beforeEach(function () {
            grid.getActiveCell.and.returnValue({row: 3, cell: 1});
            getSelectedRangesSpy.and.returnValue([
              RangeSelectionHelper.rangeForRow(grid, 3),
            ]);
          });

          it('resets the selected row', function () {
            onClickFunction({}, {row: 3, cell: 0});

            expect(grid.resetActiveCell).toHaveBeenCalled();
          });

          describe('when we select a different row', function () {
            it('should change the active cell', function () {
              onClickFunction({}, {row: 9, cell: 0});

              expect(grid.setActiveCell).toHaveBeenCalledWith(9, 1);
            });
          });
        });

        describe('when there are 2 rows selected', function () {
          beforeEach(function () {
            grid.getActiveCell.and.returnValue({row: 3, cell: 1});
            getSelectedRangesSpy.and.returnValue([
              RangeSelectionHelper.rangeForRow(grid, 5),
              RangeSelectionHelper.rangeForRow(grid, 3),
            ]);
          });

          describe('when the last selected row is clicked again', function () {
            it('should change the active cell to the first selected row', function () {
              onClickFunction({}, {row: 3, cell: 0});

              expect(grid.setActiveCell).toHaveBeenCalledWith(5, 1);
            });
          });

          describe('when the first selected row is clicked again', function () {
            it('should not change the active cell', function () {
              onClickFunction({}, {row: 5, cell: 0});

              expect(grid.setActiveCell).not.toHaveBeenCalled();
            });
          });
        });

        describe('and the editable new row', function () {
          beforeEach(function () {
            onClickFunction({}, {row: 10, cell: 0});
          });
          it('does not select the row', function () {
            expect(grid.setActiveCell).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
