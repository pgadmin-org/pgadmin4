define(['sources/selection/range_selection_helper'],
function (RangeSelectionHelper) {
  return {
    getUnion: function (allRanges) {
      if (_.isEmpty(allRanges)) {
        return [];
      }

      allRanges.sort(firstElementNumberComparator);
      var unionedRanges = [allRanges[0]];

      allRanges.forEach(function (range) {
        var maxBeginningOfRange = _.last(unionedRanges);
        if (isStartInsideRange(range, maxBeginningOfRange)) {
          if (!isEndInsideRange(range, maxBeginningOfRange)) {
            maxBeginningOfRange[1] = range[1];
          }
        } else {
          unionedRanges.push(range);
        }
      });

      return unionedRanges;

      function firstElementNumberComparator(a, b) {
        return a[0] - b[0];
      }

      function isStartInsideRange(range, surroundingRange) {
        return range[0] <= surroundingRange[1] + 1;
      }

      function isEndInsideRange(range, surroundingRange) {
        return range[1] <= surroundingRange[1];
      }
    },

    mapDimensionBoundaryUnion: function (unionedDimensionBoundaries, iteratee) {
      var mapResult = [];
      unionedDimensionBoundaries.forEach(function (subrange) {
        for (var index = subrange[0]; index <= subrange[1]; index += 1) {
          mapResult.push(iteratee(index));
        }
      });
      return mapResult;
    },

    mapOver2DArray: function (rowRangeBounds, colRangeBounds, processCell, rowCollector) {
      var unionedRowRanges = this.getUnion(rowRangeBounds);
      var unionedColRanges = this.getUnion(colRangeBounds);

      return this.mapDimensionBoundaryUnion(unionedRowRanges, function (rowId) {
        var rowData = this.mapDimensionBoundaryUnion(unionedColRanges, function (colId) {
          return processCell(rowId, colId);
        });
        return rowCollector(rowData);
      }.bind(this));
    },

    rangesToCsv: function (data, columnDefinitions, selectedRanges) {

      var rowRangeBounds = selectedRanges.map(function (range) {
        return [range.fromRow, range.toRow];
      });
      var colRangeBounds = selectedRanges.map(function (range) {
        return [range.fromCell, range.toCell];
      });

      if (!RangeSelectionHelper.isFirstColumnData(columnDefinitions)) {
        colRangeBounds = this.removeFirstColumn(colRangeBounds);
      }

      var csvRows = this.mapOver2DArray(rowRangeBounds, colRangeBounds, this.csvCell.bind(this, data, columnDefinitions), function (rowData) {
        return rowData.join(',');
      });

      return csvRows.join('\n');
    },

    removeFirstColumn: function (colRangeBounds) {
      var unionedColRanges = this.getUnion(colRangeBounds);

      if(unionedColRanges.length == 0) {
        return [];
      }

      var firstSubrangeStartsAt0 = function () {
        return unionedColRanges[0][0] == 0;
      };

      function firstSubrangeIsJustFirstColumn() {
        return unionedColRanges[0][1] == 0;
      }

      if (firstSubrangeStartsAt0()) {
        if (firstSubrangeIsJustFirstColumn()) {
          unionedColRanges.shift();
        } else {
          unionedColRanges[0][0] = 1;
        }
      }
      return unionedColRanges;
    },

    csvCell: function (data, columnDefinitions, rowId, colId) {
      var val = data[rowId][columnDefinitions[colId].field];

      if (val && _.isObject(val)) {
        val = '\'' + JSON.stringify(val) + '\'';
      } else if (val && typeof val != 'number' && typeof val != 'boolean') {
        val = '\'' + val.toString() + '\'';
      } else if (_.isNull(val) || _.isUndefined(val)) {
        val = '';
      }
      return val;
    },
  };
});