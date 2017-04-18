define(["jquery",
    "underscore",
    "slickgrid/slick.grid",
    "slickgrid/slick.rowselectionmodel",
    "sources/selection/grid_selector"
  ],
  function ($, _, SlickGrid, RowSelectionModel, GridSelector) {
    describe("GridSelector", function () {
      var container, data, columns, gridSelector, rowSelectionModel;

      beforeEach(function () {
        container = $("<div></div>");
        container.height(9999);
        columns = [{
          id: '1',
          name: 'some-column-name',
        }, {
          id: '2',
          name: 'second column',
        }];

        gridSelector = new GridSelector();
        columns = gridSelector.getColumnDefinitionsWithCheckboxes(columns);

        data = [];
        for (var i = 0; i < 10; i++) {
          data.push({'some-column-name': 'some-value-' + i, 'second column': 'second value ' + i});
        }
        var grid = new SlickGrid(container, data, columns);

        rowSelectionModel = new RowSelectionModel();
        grid.setSelectionModel(rowSelectionModel);

        grid.registerPlugin(gridSelector);
        grid.invalidate();

        $("body").append(container);
      });

      afterEach(function () {
        $("body").find(container).remove();
      });

      it("renders an additional column on the left for selecting rows", function () {
        expect(columns.length).toBe(3);

        var leftmostColumn = columns[0];
        expect(leftmostColumn.id).toBe('row-header-column');
      });

      it("renders checkboxes for selecting columns", function () {
        expect(container.find('[data-test="output-column-header"] input').length).toBe(2)
      });

      it("renders a checkbox for selecting all the cells", function () {
        expect(container.find("[title='Select/Deselect All']").length).toBe(1);
      });

      describe("when the cell for the select/deselect all is clicked", function () {
        it("selects the whole grid", function () {
          container.find("[title='Select/Deselect All']").parent().click();

          var selectedRanges = rowSelectionModel.getSelectedRanges();
          expect(selectedRanges.length).toBe(1);
          var selectedRange = selectedRanges[0];
          expect(selectedRange.fromCell).toBe(1);
          expect(selectedRange.toCell).toBe(2);
          expect(selectedRange.fromRow).toBe(0);
          expect(selectedRange.toRow).toBe(9);
        });

        it("checks the checkbox", function () {
          container.find("[title='Select/Deselect All']").parent().click();

          expect($(container.find("[data-id='checkbox-select-all']")).is(':checked')).toBeTruthy();
        })
      });

      describe("when the main checkbox in the corner gets selected", function () {
        it("unchecks all the columns", function () {
          container.find("[title='Select/Deselect All']").click();

          expect($(container.find('.slick-header-columns input')[1]).is(':checked')).toBeFalsy();
          expect($(container.find('.slick-header-columns input')[2]).is(':checked')).toBeFalsy();
        });

        it("selects all the cells", function () {
          container.find("[title='Select/Deselect All']").click();

          var selectedRanges = rowSelectionModel.getSelectedRanges();
          expect(selectedRanges.length).toBe(1);
          var selectedRange = selectedRanges[0];
          expect(selectedRange.fromCell).toBe(1);
          expect(selectedRange.toCell).toBe(2);
          expect(selectedRange.fromRow).toBe(0);
          expect(selectedRange.toRow).toBe(9);
        });

        describe("when the main checkbox in the corner gets deselected", function () {
          beforeEach(function () {
            container.find("[title='Select/Deselect All']").click();
          });

          it("deselects all the cells", function () {
            container.find("[title='Select/Deselect All']").click();

            var selectedRanges = rowSelectionModel.getSelectedRanges();
            expect(selectedRanges.length).toBe(0);
          });
        });

        describe("and then the underlying selection changes", function () {
          beforeEach(function () {
            container.find("[title='Select/Deselect All']").click();
          });

          it("unchecks the main checkbox", function () {
            var ranges = [new Slick.Range(0, 0, 0, 1)];
            rowSelectionModel.setSelectedRanges(ranges);

            expect($(container.find("[title='Select/Deselect All']")).is(':checked')).toBeFalsy();
          });
        });
      });
    });
  });
