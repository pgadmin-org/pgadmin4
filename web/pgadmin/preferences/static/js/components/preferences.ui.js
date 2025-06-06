/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { BaseUISchema } from '../../../../static/js/SchemaView';

export default class PreferencesSchema extends BaseUISchema {
  constructor(initValues = {}, schemaFields = []) {
    super({
      ...initValues
    });
    this.schemaFields = schemaFields;
    this.category = '';
  }

  get idAttribute() {
    return 'id';
  }

  categoryUpdated() {
    this.state?.validate(this.sessData);
  }

  get baseFields() {
    return this.schemaFields;
  }
}
