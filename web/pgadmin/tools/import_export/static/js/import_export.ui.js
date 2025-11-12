/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
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
      default_string: undefined,
      is_import: !fieldOptions?.isQueryExport,
      is_query_export: fieldOptions?.isQueryExport,
      header: undefined,
      freeze: undefined,
      delimiter: ',',
      quote: '"',
      escape: '\'',
      file: undefined,
      format: 'csv',
      total_columns: 0,
      on_error: 'stop',
      log_verbosity: 'default',
      ...initValues,
    });

    this.fieldOptions = {
      columns:[],
      encoding: fieldOptions.encoding,
      ...fieldOptions,
    };

    this.colums_selection_label = {e:gettext('Columns to export'), i:gettext('Columns to import')};
    this._type = 'e';
    this.notNullColOptions = [];
    this.isQueryExport = fieldOptions?.isQueryExport;
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
        visible: !obj.isQueryExport,
      },
      {
        id: 'filename',
        label: gettext('Filename'),
        group: gettext('General'),
        deps: ['is_import', 'format'],
        noEmpty: true,
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
              dialogType: state.is_import && !state?.is_query_export ? 'select_file' : 'create_file',
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
        id: 'on_error',
        label: gettext('On Error'),
        group: gettext('General'),
        type: 'select',
        controlProps: { allowClear: false, noEmpty: true },
        options: [
          {
            label: gettext('stop'),
            value: 'stop',
          },
          {
            label: gettext('ignore'),
            value: 'ignore',
          }
        ],
        min_version: 170000,
        disabled: function(state) {
          return (state?.format == 'binary' || !state?.is_import);
        },
        visible: !obj.isQueryExport,
        helpMessage: gettext('Specifies how to behave when encountering an error converting a columns input value into its data type. An error_action value of stop means fail the command, while ignore means discard the input row and continue with the next one. The default is stop. The ignore option is applicable only for COPY FROM when the FORMAT is text or csv.')
      },
      {
        id: 'log_verbosity',
        label: gettext('Log Verbosity'),
        group: gettext('General'),
        type: 'select',
        controlProps: { allowClear: false, noEmpty: true },
        options: [
          {
            label: gettext('default'),
            value: 'default',
          },
          {
            label: gettext('verbose'),
            value: 'verbose',
          }
        ],
        min_version: 170000,
        disabled: function(state) {
          return (state?.format == 'binary' || !state?.is_import);
        },
        visible: !obj.isQueryExport,
        helpMessage: gettext('Specify the amount of messages emitted by a COPY command: default or verbose. If verbose is specified, additional messages are emitted during processing. This is currently used in COPY FROM command when ON_ERROR option is set to ignore.')
      },
      {
        id: 'header',
        label: gettext('Header'),
        type: 'switch',
        group: gettext('Options'),
        disabled: this.isDisabled
      },
      {
        id: 'freeze',
        label: gettext('Freeze'),
        type: 'switch',
        group: gettext('Options'),
        deps: ['is_import'],
        depChange: (state) => {
          if (!state.is_import) {
            return { freeze: false };
          }
        },
        disabled: function(state) {
          return !state?.is_import;
        },
        visible: !obj.isQueryExport,
        helpMessage: gettext('Requests copying the data with rows already frozen, just as they would be after running the VACUUM FREEZE command.')
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
          'label': '"',
          'value': '"',
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
          'label': '"',
          'value': '"',
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
        label: gettext('NULL String'),
        group: gettext('Options'),
        type: 'text',
        deps: ['format'],
        disabled: function(state) {
          return (state?.format == 'binary');
        },
        helpMessage: gettext('Specifies the string that represents a null value. The default is \\N (backslash-N) in text format, and an unquoted empty string in CSV format. You might prefer an empty string even in text format for cases where you don\'t want to distinguish nulls from empty strings. This option is not allowed when using binary format.'),
      },
      {
        id: 'default_string',
        label: gettext('Default String'),
        group: gettext('Options'),
        type: 'text',
        deps: ['format'],
        min_version: 160000,
        visible: !obj.isQueryExport,
        disabled: function(state) {
          return (state?.format == 'binary' || !state?.is_import);
        },
        helpMessage: gettext('Specifies the string that represents a default value. Each time the string is found in the input file, the default value of the corresponding column will be used. This option is allowed only in COPY FROM, and only when not using binary format'),
      },
      {
        id: 'export_group', type: 'group', label: obj.isQueryExport ? gettext('Query') : gettext('Columns'),
      },
      {
        id: 'columns',
        group: 'export_group',
        type: () => ({
          type: 'select',
          label: this.colums_selection_label[this._type],
          options: obj.fieldOptions.columns,
          optionsLoaded: (options) => {
            obj.notNullColOptions = options.map((o) => {
              return { ...o, selected: false };
            });

            if (!obj.state) return;

            obj.state.setUnpreparedData(['total_columns'], obj.notNullColOptions.length);
            const data = obj.state.data;
            obj.state.data = {
              ...data,
              notNullColOptions: obj.notNullColOptions,
            };
          },
          controlProps:{
            multiple: true, allowClear: false, allowSelectAll: true,
            placeholder:
              this._type === 'i' ? gettext('Columns for importing...') :
                gettext('Columns for exporting...'),
          },
        }),
        deps:['is_import'],
        depChange:(state)=>{
          this._type = state.is_import? 'i' : 'e';
        },
        visible: !obj.isQueryExport,
        helpMessage: gettext('An optional list of columns to be copied. If no column list is specified, all columns of the table will be copied.')
      },
      {
        id: 'query',
        label: gettext('Export Data Query'),
        group: 'export_group',
        type: 'sql',
        visible: obj.isQueryExport,
        helpMessage: gettext('Specifies A SELECT, VALUES, INSERT, UPDATE, DELETE, or MERGE command whose results are to be copied.'),
      },
      {
        id: 'force_quote_columns',
        label: gettext('Force Quote columns'),
        group: 'export_group',
        deps: ['format', 'is_import', 'notNullColOptions'],
        type: () => {
          if (obj.fieldOptions.isQueryExport) {
            return {
              type: 'select',
              options: [],
              controlProps: {
                multiple: true, allowClear: true,
                creatable: true, noDropdown: true,
                placeholder: gettext('Force Quote columns...'),
              },
            };
          } else {
            return {
              type: 'select',
              options: obj.notNullColOptions,
              optionsReloadBasis: obj.notNullColOptions.length,
              controlProps: {
                multiple: true, allowClear: true, allowSelectAll: true,
                placeholder: gettext('Force Quote columns...'),
              },
            };
          }
        },
        disabled:function(state){
          return (state?.format != 'csv' || state?.is_query_export ? false : state?.is_import);
        },
        helpMessage: gettext('Forces quoting to be used for all non-NULL values in each specified column. NULL output is never quoted. If * is specified, non-NULL values will be quoted in all columns. This option is allowed only in COPY TO, and only when using CSV format.'),
      },
      {
        id: 'not_null_columns',
        label: gettext('NOT NULL columns'),
        group: 'export_group',
        deps: ['format', 'is_import', 'notNullColOptions'],
        type: () => ({
          type: 'select',
          options: obj.notNullColOptions,
          optionsReloadBasis: obj.notNullColOptions.length,
          controlProps: {
            multiple: true, allowClear: true, allowSelectAll: true,
            placeholder: gettext('Not null columns...'),
          },
        }),
        visible: !obj.isQueryExport,
        disabled:function(state){
          return (state?.format != 'csv' || !state?.is_import);
        },
        helpMessage: gettext('Do not match the specified column values against the null string. In the default case where the null string is empty, this means that empty values will be read as zero-length strings rather than nulls, even when they are not quoted. This option is allowed only in import, and only when using CSV format.'),
      },
      {
        id: 'null_columns',
        label: gettext('NULL columns'),
        group: 'export_group',
        deps: ['format', 'is_import', 'notNullColOptions'],
        type: () => ({
          type: 'select',
          options: obj.notNullColOptions,
          optionsReloadBasis: obj.notNullColOptions.length,
          controlProps: {
            multiple: true, allowClear: true, allowSelectAll: true,
            placeholder: gettext('Null columns...'),
          },
        }),
        visible: !obj.isQueryExport,
        disabled:function(state){
          return (state?.format != 'csv' || !state?.is_import);
        },
        helpMessage: gettext('Match the specified columns values against the null string, even if it has been quoted, and if a match is found set the value to NULL. In the default case where the null string is empty, this converts a quoted empty string into NULL. This option is allowed only in COPY FROM, and only when using CSV format.'),
      },
      {
        id: 'notNullColOptions', exclude: true, visible: false, type: 'text',
      },
      {
        id: 'total_columns', visible: false, type: 'int',
      },
      {
        id: 'is_query_export', visible: false, type: 'boolean',
      },
    ];
  }
  validate(state, setError) {
    if (this.isQueryExport) {
      let errmsg = null;
      if (isEmptyString(state.query)) {
        errmsg = gettext('Export Data Query can not be empty.');
        setError('query', errmsg);
        return true;
      } else {
        setError('query', null);
      }
    }
  }
}
