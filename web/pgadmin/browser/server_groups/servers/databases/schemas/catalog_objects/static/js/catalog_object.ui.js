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

export default class CatalogObjectSchema extends BaseUISchema {
  constructor() {
    super({
      name: undefined,
      is_sys_obj: undefined,
      description: undefined
    });
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        editable: false, type: 'text', mode: ['properties', 'edit']
      },
      {
        id: 'oid', label: gettext('OID'), cell: 'text',
        editable: false, type: 'text', mode: ['properties', 'edit']
      },
      {
        id: 'owner', label: gettext('Owner'),
        editable: false, type: 'text', mode: ['properties', 'edit']
      },{
        id: 'is_sys_obj', label: gettext('System database?'),
        cell: 'switch', type: 'switch', mode: ['properties'],
      },{
        id: 'description', label: gettext('Comment'),
        editable: false, type: 'multiline', mode: ['properties', 'edit']
      }
    ];
  }
}
