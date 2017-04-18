define(
  ["jquery",
    "underscore",
    "slickgrid/slick.grid",
    "sources/selection/column_selector",
    "slickgrid/slick.rowselectionmodel",
    "slickgrid"
  ],
  function ($, _, SlickGrid, ColumnSelector, RowSelectionModel, Slick) {
    describe("ColumnSelector", function () {
      var container, data, columns, options;
      beforeEach(function () {
        container = $("<div></div>");
        container.height(9999);

        data = [{'some-column-name': 'first value', 'second column': 'second value'}];

        columns = [
          {
            id: '1',
            name: 'some-column-name',
          },
          {
            id: '2',
            name: 'second column',
          },
          {
            name: 'some-non-selectable-column',
            selectable: false
          }
        ]
      });

      describe("when a column is not selectable", function () {
        it("does not create a checkbox for selecting the column", function () {
          var checkboxColumn = {
            name: 'some-column-name-4',
            selectable: false
          };
          columns.push(checkboxColumn);

          setupGrid(columns);

          expect(container.find('.slick-header-columns input').length).toBe(2)
        });
      });

      it("renders a checkbox in the column header", function () {
        setupGrid(columns);

        expect(container.find('.slick-header-columns input').length).toBe(2)
      });

      it("displays the name of the column", function () {
        setupGrid(columns);

        expect($(container.find('.slick-header-columns .slick-column-name')[0]).text())
          .toContain('some-column-name');
        expect($(container.find('.slick-header-columns .slick-column-name')[1]).text())
          .toContain('second column');
      });

      it("preserves the other attributes of column definitions", function () {
        var columnSelector = new ColumnSelector();
        var selectableColumns = columnSelector.getColumnDefinitionsWithCheckboxes(columns);

        expect(selectableColumns[0].id).toBe('1');
      });

      describe("selecting columns", function () {
        var grid, rowSelectionModel;
        beforeEach(function () {
          var columnSelector = new ColumnSelector();
          columns = columnSelector.getColumnDefinitionsWithCheckboxes(columns);
          data = [];
          for (var i = 0; i < 10; i++) {
            data.push({'some-column-name': 'some-value-' + i, 'second column': 'second value ' + i});
          }
          grid = new SlickGrid(container, data, columns, options);

          rowSelectionModel = new RowSelectionModel();
          grid.setSelectionModel(rowSelectionModel);

          grid.registerPlugin(columnSelector);
          grid.invalidate();
          $("body").append(container);
        });

        afterEach(function () {
          $("body").find(container).remove();
        });

        describe("when the user clicks a column header", function () {
          it("selects the column", function () {
            container.find('.slick-header-column')[0].click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expectOnlyTheFirstColumnToBeSelected(selectedRanges);
          });
        });

        describe("when the user clicks additional column headers", function () {
          beforeEach(function () {
            container.find('.slick-header-column')[1].click();
          });

          it("selects additional columns", function () {
            container.find('.slick-header-column')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            var column1 = selectedRanges[0];

            expect(selectedRanges.length).toEqual(2);
            expect(column1.fromCell).toBe(1);
            expect(column1.toCell).toBe(1);

            var column2 = selectedRanges[1];

            expect(column2.fromCell).toBe(0);
            expect(column2.toCell).toBe(0);
          });
        });

        describe("when the user clicks a column header checkbox", function () {
          it("selects the column", function () {
            container.find('.slick-header-columns input')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expectOnlyTheFirstColumnToBeSelected(selectedRanges);
          });

          it("checks the checkbox", function () {
            container.find('.slick-header-column')[1].click();
            expect($(container.find('.slick-header-columns input')[1]).is(':checked')).toBeTruthy();
          });
        });

        describe("when a row is selected", function () {
          beforeEach(function () {
            var selectedRanges = [new Slick.Range(0, 0, 0, 1)];
            rowSelectionModel.setSelectedRanges(selectedRanges);
          });

          it("deselects the row", function () {
            container.find('.slick-header-column')[1].click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();

            expect(selectedRanges.length).toBe(1);

            var column = selectedRanges[0];

            expect(column.fromCell).toBe(1);
            expect(column.toCell).toBe(1);
            expect(column.fromRow).toBe(0);
            expect(column.toRow).toBe(9);
          })
        });

        describe("clicking a second time", function () {
          beforeEach(function () {
            container.find('.slick-header-column')[1].click();
          });

          it("unchecks checkbox", function () {
            container.find('.slick-header-column')[1].click();
            expect($(container.find('.slick-header-columns input')[1]).is(':checked')).toBeFalsy();
          });

          it("deselects the column", function () {
            container.find('.slick-header-column')[1].click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();

            expect(selectedRanges.length).toEqual(0);
          })
        });

        describe("when the column is not selectable", function () {
          it("does not select the column", function () {
            $(container.find('.slick-header-column:contains(some-non-selectable-column)')).click();
            var selectedRanges = rowSelectionModel.getSelectedRanges();

            expect(selectedRanges.length).toEqual(0);
          });
        });

        describe("when the column is deselected through setSelectedRanges", function () {
          beforeEach(function () {
            container.find('.slick-header-column')[1].click();
          });

          it("unchecks the checkbox", function () {
            rowSelectionModel.setSelectedRanges([]);

            expect($(container.find('.slick-header-columns input')[1])
              .is(':checked')).toBeFalsy();
          });
        });

        describe("when a non-column range was already selected", function () {
          beforeEach(function () {
            var selectedRanges = [new Slick.Range(0, 0, 1, 0)];
            rowSelectionModel.setSelectedRanges(selectedRanges);
          });

          it("deselects the non-column range", function () {
            container.find('.slick-header-column')[0].click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expectOnlyTheFirstColumnToBeSelected(selectedRanges);
          })
        });
      });

      var setupGrid = function (columns) {
        var columnSelector = new ColumnSelector();
        columns = columnSelector.getColumnDefinitionsWithCheckboxes(columns);
        var grid = new SlickGrid(container, data, columns, options);

        var rowSelectionModel = new RowSelectionModel();
        grid.setSelectionModel(rowSelectionModel);

        grid.registerPlugin(columnSelector);
        grid.invalidate();
      };

      function expectOnlyTheFirstColumnToBeSelected(selectedRanges) {
        var row = selectedRanges[0];

        expect(selectedRanges.length).toEqual(1);
        expect(row.fromCell).toBe(0);
        expect(row.toCell).toBe(0);
        expect(row.fromRow).toBe(0);
        expect(row.toRow).toBe(9);
      }
    });
  });
