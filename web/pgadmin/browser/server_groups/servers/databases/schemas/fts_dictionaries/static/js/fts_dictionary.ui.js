/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import OptionsSchema from '../../../../../static/js/options.ui';

export default class FTSDictionarySchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,        // FTS Dictionary name
      owner: undefined,       // FTS Dictionary owner
      is_sys_obj: undefined,  // Is system object
      description: undefined, // Comment on FTS Dictionary
      schema: undefined,      // Schema name FTS dictionary belongs to
      template: undefined,    // Template list for FTS dictionary node
      options: undefined,      // option/value pair list for FTS Dictionary
      ...initValues
    });
    this.fieldOptions = {
      role: [],
      schema: [],
      fts_template: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text', type: 'text',
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        editable: false, type: 'text', mode:['properties'],
      }, {
        id: 'owner', label: gettext('Owner'), cell: 'text',
        editable: false, type: 'select', options: this.fieldOptions.role,
        mode: ['properties', 'edit','create'], noEmpty: true,
      }, {
        id: 'schema', label: gettext('Schema'),
        editable: false, type: 'select', options: this.fieldOptions.schema,
        mode: ['create', 'edit'], noEmpty: true,
      }, {
        id: 'is_sys_obj', label: gettext('System FTS dictionary?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'template', label: gettext('Template'),
        editable: false, type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.fts_template, noEmpty: true,
        mode: ['edit', 'create', 'properties'],
        readonly: function(state) { return !obj.isNew(state); },
      }, {
        id: 'options', label: gettext('Options'), type: 'collection',
        schema: new OptionsSchema('option', 'value'),
        group: gettext('Options'),
        mode: ['edit', 'create'], uniqueCol : ['option'],
        canAdd: true, canEdit: false, canDelete: true,
      }
    ];
  }
}
