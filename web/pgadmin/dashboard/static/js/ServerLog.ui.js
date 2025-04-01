/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

export default class ServerLog extends BaseUISchema {
  constructor(initValues) {
    super({
      ...initValues,
    });

  }

  get baseFields() {
    return [
      {
        id: 'error_severity',
        label: gettext('Error severity'),
        type: 'text',
        editable: false,
        noEmpty: false,
        readonly: true,
        group: gettext('Details'),
      },{
        id: 'timestamp',
        label: gettext('Log line prefix/timestamp'),
        type: 'text',
        editable: false,
        noEmpty: false,
        readonly: true,
        group: gettext('Details'),
      },{
        id: 'message',
        label: gettext('Log'),
        type: 'text',
        editable: false,
        readonly: true,
        group: gettext('Details'),
      }
    ];

  }

}
