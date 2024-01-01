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

export default class FTSParserSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      name: null,
      oid: undefined,
      version: '',
      schema: undefined,
      description: '',
      is_sys_obj: false,
      ...initValues
    });
    this.fieldOptions = {
      prsstartList: [],
      prstokenList: [],
      prsendList: [],
      prslextypeList: [],
      prsheadlineList: [],
      schemaList: [],
      ...fieldOptions
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      type: 'text', cellHeaderClasses: 'width_percent_50', noEmpty: true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      editable: false, type: 'text', mode:['properties'],
    },{
      id: 'schema', label: gettext('Schema'), cell: 'string',
      type: 'select', mode: ['create','edit'], node: 'schema',
      noEmpty: true, options: this.fieldOptions.schemaList
    },{
      id: 'is_sys_obj', label: gettext('System FTS parser?'),
      cell:'boolean', type: 'switch', mode: ['properties'],
    },{
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline', cellHeaderClasses: 'width_percent_50',
    },{
      id: 'prsstart', label: gettext('Start function'),
      group: gettext('Definition'), noEmpty: true,
      readonly: function(state) { return !obj.isNew(state); },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.prsstartList,
          optionsLoaded: (options) => { obj.fieldOptions.prsstartList = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    },{
      id: 'prstoken', label: gettext('Get next token function'), group: gettext('Definition'),
      noEmpty: true, readonly: function(state) { return !obj.isNew(state); },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.prstokenList,
          optionsLoaded: (options) => { obj.fieldOptions.prstokenList = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    },{
      id: 'prsend', label: gettext('End function'), group: gettext('Definition'),
      noEmpty: true, readonly: function(state) { return !obj.isNew(state); },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.prsendList,
          optionsLoaded: (options) => { obj.fieldOptions.prsendList = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    },{
      id: 'prslextype', label: gettext('Lextypes function'), group: gettext('Definition'),
      noEmpty: true, readonly: function(state) { return !obj.isNew(state); },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.prslextypeList,
          optionsLoaded: (options) => { obj.fieldOptions.prslextypeList = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    },{
      id: 'prsheadline', label: gettext('Headline function'), group: gettext('Definition'),
      readonly: function(state) { return !obj.isNew(state); },
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.prsheadlineList,
          optionsLoaded: (options) => { obj.fieldOptions.prsheadlineList = options; },
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
