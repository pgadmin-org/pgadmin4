/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['sources/selection/range_selection_helper', 'json-bignumber'],
  function (RangeSelectionHelper, JSONBigNumber) {
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

      getHeaderData: function (columnDefinitions, CSVOptions) {
        var headerData = [],
          field_separator = CSVOptions.field_separator || '\t',
          quote_char = CSVOptions.quote_char || '"';

        _.each(columnDefinitions, function(col) {
          if(col.display_name && col.selected) {
            headerData.push(quote_char + col.display_name + quote_char);
          }
        });

        return headerData.join(field_separator);
      },

      rangesToCsv: function (data, columnDefinitions, selectedRanges, CSVOptions, copyWithHeader) {

        var rowRangeBounds = selectedRanges.map(function (range) {
          return [range.fromRow, range.toRow];
        });
        var colRangeBounds = selectedRanges.map(function (range) {
          return [range.fromCell, range.toCell];
        });

        if (!RangeSelectionHelper.isFirstColumnData(columnDefinitions)) {
          colRangeBounds = this.removeFirstColumn(colRangeBounds);
        }

        var csvRows = this.mapOver2DArray(rowRangeBounds, colRangeBounds, this.csvCell.bind(this, data, columnDefinitions, CSVOptions), function (rowData) {
          var field_separator = CSVOptions.field_separator || '\t';
          return rowData.join(field_separator);
        });

        if (copyWithHeader) {
          var headerData = '';
          headerData = this.getHeaderData(columnDefinitions, CSVOptions);

          return headerData + '\n' + csvRows.join('\n');
        }

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

      csvCell: function (data, columnDefinitions, CSVOptions, rowId, colId) {
        var val = data[rowId][columnDefinitions[colId].field],
          cell_type = columnDefinitions[colId].cell || '',
          quoting = CSVOptions.quoting || 'strings',
          quote_char = CSVOptions.quote_char || '"';

        if (quoting == 'all') {
          if (val && _.isObject(val)) {
            val = quote_char + JSONBigNumber.stringify(val) + quote_char;
          } else if (val) {
            val = quote_char + val.toString() + quote_char;
          } else if (_.isNull(val) || _.isUndefined(val)) {
            val = '';
          }
        }
        else if(quoting == 'strings') {
          if (val && _.isObject(val)) {
            val = quote_char + JSONBigNumber.stringify(val) + quote_char;
          } else if (val && cell_type != 'number' && cell_type != 'boolean') {
            val = quote_char + val.toString() + quote_char;
          } else if (_.isNull(val) || _.isUndefined(val)) {
            val = '';
          }
        }
        return val;
      },
    };
  });
