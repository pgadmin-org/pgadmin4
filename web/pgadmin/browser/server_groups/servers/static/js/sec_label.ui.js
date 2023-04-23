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

export default class SecLabelSchema extends BaseUISchema {
  constructor() {
    super({
      provider: undefined,
      label: undefined,
    });
  }

  get baseFields() {
    return [{
      id: 'provider', label: gettext('Provider'),
      type: 'text', editable: true, cell: 'text',
    },
    {
      id: 'label', label: gettext('Security label'),
      type: 'text', editable: true, cell: 'text', noEmpty: true,
    }];
  }
}
