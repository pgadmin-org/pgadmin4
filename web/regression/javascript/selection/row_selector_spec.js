define(
  ["jquery",
    "underscore",
    "slickgrid/slick.grid",
    "sources/selection/row_selector",
    "slickgrid/slick.rowselectionmodel",
    "slickgrid",
  ],
  function ($, _, SlickGrid, RowSelector, RowSelectionModel, Slick) {
    describe("RowSelector", function () {
      var container, data, columnDefinitions, grid, rowSelectionModel;

      beforeEach(function () {
        container = $("<div></div>");
        container.height(9999);

        columnDefinitions = [{
          id: '1',
          name: 'some-column-name',
          selectable: true
        }, {
          id: '2',
          name: 'second column',
          selectable: true
        }];

        var rowSelector = new RowSelector();
        data = [];
        for (var i = 0; i < 10; i++) {
          data.push(['some-value-' + i, 'second value ' + i]);
        }
        columnDefinitions = rowSelector.getColumnDefinitionsWithCheckboxes(columnDefinitions);
        grid = new SlickGrid(container, data, columnDefinitions);

        rowSelectionModel = new RowSelectionModel();
        grid.setSelectionModel(rowSelectionModel);
        grid.registerPlugin(rowSelector);
        grid.invalidate();

        $("body").append(container);
      });

      afterEach(function () {
        $("body").find(container).remove();
      });

      it("renders an additional column on the left", function () {
        expect(columnDefinitions.length).toBe(3);

        var leftmostColumn = columnDefinitions[0];
        expect(leftmostColumn.id).toBe('row-header-column');
        expect(leftmostColumn.name).toBe('');
        expect(leftmostColumn.selectable).toBe(false);
      });

      it("renders a checkbox the leftmost column", function () {
        expect(container.find('.sr').length).toBe(11);
        expect(container.find('.sr .sc:first-child input[type="checkbox"]').length).toBe(10);
      });

      it("preserves the other attributes of column definitions", function () {
        expect(columnDefinitions[1].id).toBe('1');
        expect(columnDefinitions[1].selectable).toBe(true);
      });

      describe("selecting rows", function () {
        describe("when the user clicks a row header checkbox", function () {
          it("selects the row", function () {
            container.find('.sr .sc:first-child input[type="checkbox"]')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expectOnlyTheFirstRowToBeSelected(selectedRanges);
          });

          it("checks the checkbox", function () {
            container.find('.sr .sc:first-child input[type="checkbox"]')[5].click();

            expect($(container.find('.sr .sc:first-child input[type="checkbox"]')[5])
              .is(':checked')).toBeTruthy();
          });
        });

        describe("when the user clicks a row header", function () {
          it("selects the row", function () {
            container.find('.sr .sc:first-child')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expectOnlyTheFirstRowToBeSelected(selectedRanges);
          });

          it("checks the checkbox", function () {
            container.find('.sr .sc:first-child')[7].click();

            expect($(container.find('.sr .sc:first-child input[type="checkbox"]')[7])
              .is(':checked')).toBeTruthy();
          });
        });

        describe("when the user clicks multiple row headers", function () {
          it("selects another row", function () {
            container.find('.sr .sc:first-child')[4].click();
            container.find('.sr .sc:first-child')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expect(selectedRanges.length).toEqual(2);

            var row1 = selectedRanges[0];
            expect(row1.fromRow).toBe(4);
            expect(row1.toRow).toBe(4);

            var row2 = selectedRanges[1];
            expect(row2.fromRow).toBe(0);
            expect(row2.toRow).toBe(0);
          });
        });

        describe("when a column was already selected", function () {
          beforeEach(function () {
            var selectedRanges = [new Slick.Range(0, 0, 0, 1)];
            rowSelectionModel.setSelectedRanges(selectedRanges);
          });

          it("deselects the column", function () {
            container.find('.sr .sc:first-child')[0].click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();

            expectOnlyTheFirstRowToBeSelected(selectedRanges);
          })
        });

        describe("when the row is deselected through setSelectedRanges", function () {
          beforeEach(function () {
            container.find('.sr .sc:first-child')[4].click();
          });

          it("should uncheck the checkbox", function () {
            rowSelectionModel.setSelectedRanges([]);

            expect($(container.find('.sr .sc:first-child input[type="checkbox"]')[4])
              .is(':checked')).toBeFalsy();
          });
        });

        describe("click a second time", function () {
          beforeEach(function () {
            container.find('.sr .sc:first-child')[1].click();
          });

          it("unchecks checkbox", function () {
            container.find('.sr .sc:first-child')[1].click();
            expect($(container.find('.sr .sc:first-child input[type="checkbox"]')[1])
              .is(':checked')).toBeFalsy();
          });

          it("unselects the row", function () {
            container.find('.sr .sc:first-child')[1].click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();

            expect(selectedRanges.length).toEqual(0);
          })
        });
      });
    });

    function expectOnlyTheFirstRowToBeSelected(selectedRanges) {
      var row = selectedRanges[0];

      expect(selectedRanges.length).toEqual(1);
      expect(row.fromCell).toBe(1);
      expect(row.toCell).toBe(2);
      expect(row.fromRow).toBe(0);
      expect(row.toRow).toBe(0);
    }
  });