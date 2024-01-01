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
import OptionsSchema from '../../../../../../static/js/options.ui';

export default class UserMappingSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      is_sys_obj: undefined,
      um_options: [],
      ...initValues,
    });
    this.fieldOptions = {
      role: [],
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
        id: 'name', label: gettext('User'), type: 'select',
        options: this.fieldOptions.role,
        controlProps: { allowClear: false },
        readonly: function(state) {return !obj.isNew(state); },
        mode: ['edit', 'create', 'properties']
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'is_sys_obj', label: gettext('System user mapping?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'umoptions', label: gettext('Options'), type: 'collection',
        schema: new OptionsSchema('umoption', 'umvalue'),
        group: gettext('Options'),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['umoption'],
      }
    ];
  }
}
