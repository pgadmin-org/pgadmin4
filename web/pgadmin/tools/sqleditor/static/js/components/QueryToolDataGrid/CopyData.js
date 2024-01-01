/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
    let csvRows = rows.reduce((prevCsvRows, currRow)=>{
      let csvRow = columns.reduce((prevCsvCols, column)=>{
        prevCsvCols.push(this.csvCell(currRow[column.key], column));
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

  csvCell(value, column, header=false) {
    if (this.CSVOptions.quoting == 'all' || header) {
      value = this.allQuoteCell(value);
    } else if(this.CSVOptions.quoting == 'strings') {
      value = this.stringQuoteCell(value, column);
    }
    return value;
  }

  getCopiedRows() {
    let copiedText = clipboard.getFromClipboard();
    let copiedRows = CSVToArray(copiedText, this.CSVOptions.field_separator, this.CSVOptions.quote_char);

    if(localStorage.getItem('copied-with-headers') == 'true') {
      copiedRows = copiedRows.slice(1);
    }
    return copiedRows;
  }
}
