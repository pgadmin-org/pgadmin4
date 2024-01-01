/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

export default class FTSTemplateSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      name: null,
      oid: undefined,
      version: '',
      schema: undefined,
      description: '',
      is_sys_obj: false,
      tmplinit: undefined,
      tmpllexize: undefined,     // Lexize function for fts template
      ...initValues
    });
    this.fieldOptions = {
      schemaList: [],
      initFunctionList: [],
      lexisFunctionList: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'string', type: 'text',
      cellHeaderClasses: 'width_percent_50', noEmpty: true,
    }, {
      id: 'oid', label: gettext('OID'), cell: 'string',
      editable: false, type: 'text', mode: ['properties'],
    }, {
      id: 'schema', label: gettext('Schema'), mode: ['create', 'edit'], node: 'schema',
      type: 'select', editable: false, noEmpty: true, options: this.fieldOptions.schemaList,
    }, {
      id: 'is_sys_obj', label: gettext('System FTS template?'),
      cell: 'boolean', type: 'switch', mode: ['properties'],
    }, {
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline', cellHeaderClasses: 'width_percent_50',
    }, {
      id: 'tmplinit', label: gettext('Init function'), group: gettext('Definition'),
      cache_level: 'database', cache_node: 'schema',
      readonly: function (state) {
        return !obj.isNew(state);
      },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.initFunctionList,
          optionsLoaded: (options) => { obj.fieldOptions.initFunctionData = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    }, {
      id: 'tmpllexize', label: gettext('Lexize function'), group: gettext('Definition'),
      noEmpty: true, cache_level: 'database', cache_node: 'schema',
      readonly: function (state) {
        return !obj.isNew(state);
      },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.lexisFunctionList,
          optionsLoaded: (options) => { obj.fieldOptions.lexisFunctionData = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    }];
  }
}
