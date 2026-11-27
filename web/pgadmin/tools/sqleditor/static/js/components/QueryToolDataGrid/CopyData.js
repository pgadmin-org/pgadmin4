/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import JSONBigNumber from 'json-bignumber';
import _ from 'lodash';
import * as clipboard from '../../../../../../static/js/clipboard';
import { CSVToArray } from '../../../../../../static/js/utils';

export default class CopyData {
  constructor(options) {
    this.CSVOptions = {
      field_separator: '\t',
      quote_char: '"',
      quoting: 'strings',
      quote_single_cell: false,
      ...options,
    };
  }

  setCSVOptions(options) {
    this.CSVOptions = {
      ...this.CSVOptions,
      ...options,
    };
  }

  copyRowsToCsv(rows=[], columns=[], withHeaders=false) {
    /* A single cell is copied unquoted unless the user has opted in. */
    const isSingleCell = rows.length === 1 && columns.length === 1 && !withHeaders
      && !this.CSVOptions.quote_single_cell;
    let csvRows = rows.reduce((prevCsvRows, currRow)=>{
      let csvRow = columns.reduce((prevCsvCols, column)=>{
        prevCsvCols.push(this.csvCell(currRow[column.key], column, false, isSingleCell));
        return prevCsvCols;
      }, []).join(this.CSVOptions.field_separator);
      prevCsvRows.push(csvRow);
      return prevCsvRows;
    }, []);

    if(withHeaders) {
      let csvRow = columns.reduce((prevCsvCols, column)=>{
        prevCsvCols.push(this.csvCell(column.name, column, true));
        return prevCsvCols;
      }, []).join(this.CSVOptions.field_separator);
      csvRows.unshift(csvRow);
    }
    clipboard.copyToClipboard(csvRows.join('\n'));
    localStorage.setItem('copied-with-headers', withHeaders);
    /* Push actual row to storage, can be used to identify null columns */
    localStorage.setItem('copied-rows', JSON.stringify(rows));
  }

  /*
   * Format rows as a GitHub-flavoured Markdown table. A table always needs a
   * header row, so the column names are included whatever the "Copy with
   * headers" setting is.
   */
  rowsToMarkdown(rows=[], columns=[]) {
    if(columns.length === 0) {
      return '';
    }
    const mdRow = (cells)=>'| ' + cells.join(' | ') + ' |';
    return [
      mdRow(columns.map((column)=>this.markdownCell(column.name))),
      mdRow(columns.map(()=>'---')),
      ...rows.map((row)=>mdRow(columns.map((column)=>this.markdownCell(row[column.key])))),
    ].join('\n');
  }

  /*
   * NULL becomes an empty cell, as it does for a plain copy. Backslashes are
   * doubled and pipes escaped so that neither splits the cell or escapes the
   * character after it. GFM renders inline markup inside a cell, so the
   * characters that would start HTML, an entity, a link, code, emphasis or
   * strikethrough get a backslash escape too, and the value renders as
   * written. An underscore inside a word cannot start emphasis, so it is left
   * alone to keep names such as user_id readable. Line breaks become <br>,
   * added last so it is not escaped, since a table row must fit on one line.
   */
  markdownCell(value) {
    if(_.isNull(value) || _.isUndefined(value)) {
      return '';
    }
    let str = _.isObject(value) ? JSONBigNumber.stringify(value) : value.toString();
    return str.replace(/[\\|`*~[\]<&]/g, '\\$&')
      .replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, '\\_')
      .replace(/\r\n|\r|\n/g, '<br>');
  }

  copyRowsToMarkdown(rows=[], columns=[]) {
    /* Markdown cannot be pasted back as rows, so leave Paste nothing to insert */
    clipboard.copyToClipboard(this.rowsToMarkdown(rows, columns), {cache: false});
    localStorage.removeItem('copied-with-headers');
    localStorage.removeItem('copied-rows');
  }

  escape(iStr) {
    return (this.CSVOptions.quote_char == '"') ?
      iStr.replace(/\"/g, '""') : iStr.replace(/\'/g, '\'\'');
  }

  allQuoteCell(value) {
    if (value && _.isObject(value)) {
      value = this.CSVOptions.quote_char + JSONBigNumber.stringify(value) + this.CSVOptions.quote_char;
    } else if (value) {
      value = this.CSVOptions.quote_char + this.escape(value.toString()) + this.CSVOptions.quote_char;
    } else if (_.isNull(value) || _.isUndefined(value)) {
      value = '';
    }
    return value;
  }

  stringQuoteCell(value, column) {
    if (value && _.isObject(value)) {
      value = this.CSVOptions.quote_char + JSONBigNumber.stringify(value) + this.CSVOptions.quote_char;
    } else if (value && column.cell != 'number' && column.cell != 'boolean') {
      value = this.CSVOptions.quote_char + this.escape(value.toString()) + this.CSVOptions.quote_char;
    } else if (column.cell == 'string' && _.isNull(value)){
      value = null;
    } else if (_.isNull(value) || _.isUndefined(value)) {
      value = '';
    }
    return value;
  }

  csvCell(value, column, header, isSingleCell=false) {
    if(isSingleCell) {
      return value;
    } else if (this.CSVOptions.quoting == 'all' || header) {
      return this.allQuoteCell(value);
    } else if(this.CSVOptions.quoting == 'strings') {
      return this.stringQuoteCell(value, column);
    }
    return value;
  }

  getCopiedRows() {
    let copiedText = clipboard.getFromClipboard();
    /* Nothing to paste before the first copy or after a Markdown copy */
    if(copiedText === null) {
      return [];
    }
    let copiedRows = CSVToArray(copiedText, this.CSVOptions.field_separator, this.CSVOptions.quote_char);

    if(localStorage.getItem('copied-with-headers') == 'true') {
      copiedRows = copiedRows.slice(1);
    }
    return copiedRows;
  }
}
