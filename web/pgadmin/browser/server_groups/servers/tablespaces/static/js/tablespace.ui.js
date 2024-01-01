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
import SecLabelSchema from '../../../static/js/sec_label.ui';
import { isEmptyString } from '../../../../../../static/js/validators';

export default class TablespaceSchema extends BaseUISchema {
  constructor(getVariableSchema, getPrivilegeRoleSchema, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      owner: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      spclocation: undefined,
      spcoptions: [],
      spcacl: [],
      seclabels:[],
      ...initValues,
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getVariableSchema = getVariableSchema;
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
        type: 'text', mode: ['properties', 'create', 'edit'],
        noEmpty: true,
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'spcuser', label: gettext('Owner'), cell: 'text',
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false }
      }, {
        id: 'is_sys_obj', label: gettext('System tablespace?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'description', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      }, {
        id: 'spclocation', label: gettext('Location'),
        group: gettext('Definition'), type: 'text',
        mode: ['properties', 'edit','create'],
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      }, {
        id: 'spcoptions', label: '', type: 'collection',
        schema: this.getVariableSchema(),
        editable: false,
        group: gettext('Parameters'), mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
      }, {
        id: 'spcacl', label: gettext('Privileges'), type: 'collection',
        group: gettext('Security'),
        schema: this.getPrivilegeRoleSchema(['C']),
        mode: ['edit', 'create'], uniqueCol : ['grantee'],
        canAdd: true, canDelete: true,
      }, {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        editable: false, group: gettext('Security'),
        schema: new SecLabelSchema(),
        mode: ['edit', 'create'],
        min_version: 90200,
        uniqueCol : ['provider'],
        canAdd: true, canEdit: false, canDelete: true,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (this.isNew() && isEmptyString(state.spclocation)) {
      errmsg = gettext('\'Location\' cannot be empty.');
      setError('spclocation', errmsg);
      return true;
    }
    return null;
  }
}
