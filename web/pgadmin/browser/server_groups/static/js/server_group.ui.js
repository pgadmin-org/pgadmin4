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

export default class ServerGroupSchema extends BaseUISchema {
  constructor() {
    super({
      id: undefined,
      name: null,
      user_id: undefined,
    });
  }

  get baseFields() {
    return [
      {
        id: 'id', label: gettext('ID'), type: 'int', group: null,
        mode: ['properties'], visible: true,
      },{
        id: 'name', label: gettext('Name'), type: 'text', group: null,
        mode: ['properties', 'edit', 'create'], noEmpty: true,
        disabled: false,
      }
    ];
  }
}
