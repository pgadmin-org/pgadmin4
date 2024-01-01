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

export default class EDBVarSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      datatype: undefined,
      visibility: 'Unknown',
      ...initValues
    });
    this.fieldOptions = {
      ...fieldOptions
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      type: 'text', mode: ['properties'],
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'datatype', label: gettext('Data type'), cell: 'string',
      type: 'text', readonly: true,
    },{
      id: 'visibility', label: gettext('Visibility'), cell: 'string',
      type: 'text', mode: ['properties'],
    }];
  }
}
