define(
  ["jquery",
    "slickgrid/slick.grid",
    "slickgrid/slick.rowselectionmodel",
    "sources/selection/copy_data",
    "sources/selection/clipboard",
    "sources/selection/range_selection_helper"
  ],
  function ($, SlickGrid, RowSelectionModel, copyData, clipboard, RangeSelectionHelper) {
    describe('copyData', function () {
      var grid, sqlEditor;

      beforeEach(function () {
        var data = [[1, "leopord", "12"],
          [2, "lion", "13"],
          [3, "puma", "9"]];

        var columns = [{
            name: "id",
            pos: 0,
            label: "id<br> numeric",
            cell: "number",
            can_edit: false,
            type: "numeric"
          }, {
            name: "brand",
            pos: 1,
            label: "flavor<br> character varying",
            cell: "string",
            can_edit: false,
            type: "character varying"
          }, {
            name: "size",
            pos: 2,
            label: "size<br> numeric",
            cell: "number",
            can_edit: false,
            type: "numeric"
          }
          ]
        ;
        var gridContainer = $("<div id='grid'></div>");
        $("body").append(gridContainer);
        $("body").append("<button id='btn-paste-row' disabled></button>");
        grid = new Slick.Grid("#grid", data, columns, {});
        grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
        sqlEditor = {slickgrid: grid};
      });

      afterEach(function() {
        $("body").remove('#grid');
        $("body").remove('#btn-paste-row');
      });

      describe("when rows are selected", function () {
        beforeEach(function () {
          grid.getSelectionModel().setSelectedRanges([
            RangeSelectionHelper.rangeForRow(grid, 0),
            RangeSelectionHelper.rangeForRow(grid, 2)]
          );
        });

        it("copies them", function () {
          spyOn(clipboard, 'copyTextToClipboard');

          copyData.apply(sqlEditor);

          expect(sqlEditor.copied_rows.length).toBe(2);

          expect(clipboard.copyTextToClipboard).toHaveBeenCalled();
          expect(clipboard.copyTextToClipboard.calls.mostRecent().args[0]).toContain("1,'leopord','12'");
          expect(clipboard.copyTextToClipboard.calls.mostRecent().args[0]).toContain("3,'puma','9'");
        });

        describe("when the user can edit the grid", function () {
          it("enables the paste row button", function () {
            copyData.apply(_.extend({can_edit: true}, sqlEditor));

            expect($("#btn-paste-row").prop('disabled')).toBe(false);
          });
        });
      });

      describe("when a column is selected", function () {
        beforeEach(function () {
          var firstColumn = new Slick.Range(0, 0, 2, 0);
          grid.getSelectionModel().setSelectedRanges([firstColumn])
        });

        it("copies text to the clipboard", function () {
          spyOn(clipboard, 'copyTextToClipboard');

          copyData.apply(sqlEditor);

          expect(clipboard.copyTextToClipboard).toHaveBeenCalled();

          var copyArg = clipboard.copyTextToClipboard.calls.mostRecent().args[0];
          var rowStrings = copyArg.split('\n');
          expect(rowStrings[0]).toBe("1");
          expect(rowStrings[1]).toBe("2");
          expect(rowStrings[2]).toBe("3");
        });

        it("sets copied_rows to empty", function () {
          copyData.apply(sqlEditor);

          expect(sqlEditor.copied_rows.length).toBe(0);
        });

        describe("when the user can edit the grid", function () {
          it("disables the paste row button", function () {
            copyData.apply(_.extend({can_edit: true}, sqlEditor));

            expect($("#btn-paste-row").prop('disabled')).toBe(true);
          });
        });
      });
    });
  });
