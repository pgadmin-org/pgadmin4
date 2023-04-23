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

export default class OptionsSchema extends BaseUISchema {
  constructor(optionID='option', valueID='value') {
    super({
      [optionID]: undefined,
      [valueID]: undefined,
    });
    this.optionID = optionID;
    this.valueID = valueID;
  }

  get baseFields() {
    return [{
      id: this.optionID, label: gettext('Option'),
      type: 'text', editable: true, cell: 'text',
      noEmpty: true, width: 220,
    },
    {
      id: this.valueID, label: gettext('Value'),
      type: 'text', editable: true, cell: 'text',
      noEmpty: true, width: 220
    }];
  }
}
