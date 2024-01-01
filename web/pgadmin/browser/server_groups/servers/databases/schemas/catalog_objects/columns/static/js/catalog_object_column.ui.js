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


export default class CatalogObjectColumnSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      attname: undefined,
      attowner: undefined,
      attnum: undefined,
      cltype: undefined,
      collspcname: undefined,
      attacl: undefined,
      description: undefined,
      ...initValues
    });

    this.fieldOptions = {
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'attname', label: gettext('Column'), cell: 'string',
        type: 'text', readonly: true,
      },{
        id: 'attowner', label: gettext('Owner'), cell: 'string',
        type: 'text', readonly: true,
      },{
        id: 'attnum', label: gettext('Position'), cell: 'string',
        type: 'text', readonly: true,
      },{
        id: 'cltype', label: gettext('Data type'), cell: 'string',
        group: gettext('Definition'), type: 'text', readonly: true,
      },{
        id: 'collspcname', label: gettext('Collation'), cell: 'string',
        group: gettext('Definition'), type: 'text', readonly: true,
      },{
        id: 'attacl', label: gettext('Privileges'), cell: 'string',
        group: gettext('Security'), type: 'text', readonly: true,
      },{
        id: 'is_sys_obj', label: gettext('System column?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      },{
        id: 'description', label: gettext('Comment'), cell: 'string',
        type: 'multiline', readonly: true,
      }
    ];
  }
}
