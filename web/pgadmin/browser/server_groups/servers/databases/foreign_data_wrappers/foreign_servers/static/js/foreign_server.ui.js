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
import OptionsSchema from '../../../../../static/js/options.ui';

export default class ForeignServerSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      fsrvtype: undefined,
      fsrvversion: undefined,
      fsrvvalue: undefined,
      fsrvoptions: [],
      fsrvowner: undefined,
      is_sys_obj: undefined,
      description: undefined,
      fsrvacl: [],
      ...initValues,
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
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
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'fsrvowner', label: gettext('Owner'),
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false },
      }, {
        id: 'is_sys_obj', label: gettext('System foreign server?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'fsrvtype', label: gettext('Type'),
        type: 'text', group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'fsrvversion', label: gettext('Version'),
        type: 'text', group: gettext('Definition'),
      }, {
        id: 'fsrvoptions', label: gettext('Options'), type: 'collection',
        schema: new OptionsSchema('fsrvoption', 'fsrvvalue'),
        group: gettext('Options'),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['fsrvoption'],
      }, {
        id: 'security', label: gettext('Security'), type: 'group',
      }, {
        id: 'fsrvacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['U']),
        uniqueCol : ['grantee'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      }, {
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      }
    ];
  }
}
