/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { isEmptyString } from 'sources/validators';


export default class ImportExportSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      null_string: undefined,
      is_import: true,
      icolumns: [],
      oid: undefined,
      header: undefined,
      delimiter: ',',
      quote: '\"',
      escape: '\'',
      file: undefined,
      format: 'csv',
      ...initValues,
    });

    this.fieldOptions = {
      columns:[],
      encoding: fieldOptions.encoding,
      ...fieldOptions,
    };

    this.colums_selection_label = {e:'Columns to export', i:'Columns to import'};
    this._type = 'e';
    this.notNullColOptions = [];
  }

  isDisabled(state) {
    return (state?.format != 'csv');
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'is_import',
        label: gettext('Import/Export'),
        group: gettext('General'),
        type: 'toggle',
        options: [
          { 'label': gettext('Import'), 'value': true },
          { 'label': gettext('Export'), 'value': false },
        ],
      },
      {
        id: 'filename',
        label: gettext('Filename'),
        group: gettext('General'),
        deps: ['is_import', 'format'],
        depChange:(state, source)=>{
          if (source == 'is_import'){
            let filename = state.is_import ? state.import_file_name : state.export_file_name;
            return {filename: filename};
          }
        },
        type: (state) => {
          return {
            type: 'file',
            controlProps: {
              dialogType: state.is_import ? 'select_file' : 'create_file',
              supportedTypes: ['csv', 'text','bin', '*'],
              dialogTitle: 'Select file',
            }
          };
        },
        disabled: false,
      },
      {
        id: 'format',
        label: gettext('Format'),
        group: gettext('General'),
        type: 'select',
        controlProps: { allowClear: false, noEmpty: true },
        options: [
          {
            label: gettext('binary'),
            value: 'binary',
          },
          {
            label: gettext('csv'),
            value: 'csv',
          },
          {
            label: gettext('text'),
            value: 'text',
          },
        ]
      },
      {
        id: 'encoding',
        label: gettext('Encoding'),
        group: gettext('General'),
        type: 'select',
        options: this.fieldOptions.encoding,
      },
      {
        id: 'oid',
        label: gettext('OID'),
        type: 'switch',
        group: gettext('Options')
      },
      {
        id: 'header',
        label: gettext('Header'),
        type: 'switch',
        group: gettext('Options'),
        disabled: this.isDisabled
      },
      {
        id: 'delimiter',
        label: gettext('Delimiter'),
        group: gettext('Options'),
        type: 'select',
        controlProps: { allowClear: false, creatable: true},
        deps: ['format'],
        options: [{
          'label': ';',
          'value': ';',
        },
        {
          'label': ',',
          'value': ',',
        },
        {
          'label': '|',
          'value': '|',
        },
        {
          'label': '[tab]',
          'value': '[tab]',
        },
        ],
        disabled: function(state) {
          return (state?.format == 'binary');
        },
        helpMessage: gettext('Specifies the character that separates columns within each row (line) of the file. The default is a tab character in text format, a comma in CSV format. This must be a single one-byte character. This option is not allowed when using binary format.')
      },
      {
        id: 'quote',
        label: gettext('Quote'),
        group: gettext('Options'),
        type: 'select',
        controlProps: {creatable: true},
        options: [{
          'label': '\"',
          'value': '\"',
        },
        {
          'label': '\'',
          'value': '\'',
        },
        ],
        disabled: this.isDisabled,
        helpMessage: gettext('Specifies the quoting character to be used when a data value is quoted. The default is double-quote. This must be a single one-byte character. This option is allowed only when using CSV format.'),
      },
      {
        id: 'escape',
        label: gettext('Escape'),
        group: gettext('Options'),
        type: 'select',
        controlProps: {creatable: true},
        options: [{
          'label': '\"',
          'value': '\"',
        },
        {
          'label': '\'',
          'value': '\'',
        },
        ],
        disabled: obj.isDisabled,
        helpMessage: gettext('Specifies the character that should appear before a data character that matches the QUOTE value. The default is the same as the QUOTE value (so that the quoting character is doubled if it appears in the data). This must be a single one-byte character. This option is allowed only when using CSV format.'),
      },
      {
        id: 'null_string',
        label: gettext('NULL Strings'),
        group: gettext('Options'),
        type: 'text',
        deps: ['format'],
        disabled: function(state) {
          return (state?.format == 'binary');
        },
        helpMessage: gettext('Specifies the string that represents a null value. The default is \\N (backslash-N) in text format, and an unquoted empty string in CSV format. You might prefer an empty string even in text format for cases where you don\'t want to distinguish nulls from empty strings. This option is not allowed when using binary format.'),
      },
      {
        id: 'columns',
        label: gettext(this.colums_selection_label[this._type]),
        group: gettext('Columns'),
        type: 'select',
        options: obj.fieldOptions.columns,
        optionsLoaded: (options) => {
          obj.notNullColOptions = options.map((o) => {
            return { ...o, selected: false };
          });
        },
        controlProps:{multiple: true, allowClear: false,
          placeholder: this._type === 'i' ? gettext('Columns for importing...') : gettext('Columns for exporting...'),
        },
        deps:['is_import'],
        depChange:(state)=>{
          this._type = state.is_import? 'i' : 'e';
        },
        helpMessage: gettext('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.')
      },
      {
        id: 'icolumns',
        label: gettext('NOT NULL columns'),
        group: gettext('Columns'),
        type: 'select',
        deps: ['format', 'is_import'],
        options: obj.notNullColOptions,
        optionsReloadBasis: obj.notNullColOptions.length,
        controlProps: {
          multiple: true, allowClear: true, placeholder: gettext('Not null columns...'),
        },
        disabled:function(state){
          return (state?.format != 'csv' || !state?.is_import);
        },
        helpMessage: gettext('Do not match the specified column values against the null string. In the default case where the null string is empty, this means that empty values will be read as zero-length strings rather than nulls, even when they are not quoted. This option is allowed only in import, and only when using CSV format.'),
      }
    ];
  }

  validate(state, setError) {
    if (isEmptyString(state.service)) {
      let errmsg = null;
      /* events validation*/
      if (!state.filename) {
        errmsg = gettext('Please provide a filename.');
        setError('filename', errmsg);
        return true;
      } else {
        setError('filename', null);
      }
    }
  }
}
