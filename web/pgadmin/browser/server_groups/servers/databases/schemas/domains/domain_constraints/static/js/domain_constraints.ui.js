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

export default class DomainConstraintSchema extends BaseUISchema {
  constructor(initValues) {
    super({
      name: undefined,
      oid: undefined,
      description: undefined,
      consrc: undefined,
      convalidated: true,
      ...initValues,
    });
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), type:'text', cell:'text',
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text' , mode: ['properties'],
      }, {
        id: 'is_sys_obj', label: gettext('System domain constraint?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), type: 'multiline', cell:
        'text', mode: ['properties', 'create', 'edit'], min_version: 90500,
      }, {
        id: 'consrc', label: gettext('Check'), type: 'multiline',
        group: gettext('Definition'), mode: ['properties', 'create', 'edit'],
        readonly: function(state) {return !obj.isNew(state); },
        noEmpty: true,
      }, {
        id: 'convalidated', label: gettext('Validate?'), type: 'switch',
        cell:'boolean', group: gettext('Definition'), min_version: 90200,
        mode: ['properties', 'create', 'edit'],
        readonly: function(state) {
          return !obj.isNew(state) && obj._origData.convalidated;
        }
      }
    ];
  }
}
