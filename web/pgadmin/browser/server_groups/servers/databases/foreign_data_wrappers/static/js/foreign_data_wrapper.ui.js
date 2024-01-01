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
import OptionsSchema from '../../../../static/js/options.ui';

export default class ForeignDataWrapperSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      fdwowner: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      fdwvalue: undefined,
      fdwhan: undefined,
      fdwoption: undefined,
      fdwacl: [],
      ...initValues,
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.fieldOptions = {
      role: [],
      fdwhan: [],
      fdwvalue: [],
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
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'fdwowner', label: gettext('Owner'),
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false },
      }, {
        id: 'is_sys_obj', label: gettext('System foreign data wrapper?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'fdwhan', label: gettext('Handler'),
        editable: false, type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.fdwhan,
        mode: ['edit', 'create', 'properties'],
      }, {
        id: 'fdwvalue', label: gettext('Validator'),
        editable: false, type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.fdwvalue,
        mode: ['edit', 'create', 'properties'],
      }, {
        id: 'fdwoptions', label: gettext('Options'), type: 'collection',
        schema: new OptionsSchema('fdwoption', 'fdwvalue'),
        group: gettext('Options'),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['fdwoption'],
      }, {
        id: 'security', label: gettext('Security'), type: 'group',
      }, {
        id: 'fdwacl', label: gettext('Privileges'), type: 'collection',
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
