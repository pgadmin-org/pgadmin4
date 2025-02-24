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
import { isEmptyString } from '../../../../../../static/js/validators';

export default class DirectorySchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, treeNodeInfo, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      owner: undefined,
      path: undefined,
      diracl: [],
      ...initValues,
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.fieldOptions = {
      role: [],
      ...fieldOptions,
    };
    this.treeNodeInfo = treeNodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    let fields = [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        noEmpty: true, editable: false,
        readonly: function(state) {return !obj.isNew(state); }
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'diruser', label: gettext('Owner'), cell: 'text',
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false }, isCollectionProperty: true
      },{
        id: 'path', label: gettext('Location'),
        noEmpty: true, editable: false,
        group: gettext('Definition'), type: 'text',
        mode: ['properties', 'edit','create'],
        readonly: function(state) {return !obj.isNew(state); },
      },
    ];
    // Check server version before adding version-specific security fields
    if (this.treeNodeInfo?.server?.version >= 170000) {
      fields.push({
        id: 'diracl', label: gettext('Privileges'), type: 'collection',
        group: gettext('Security'),
        schema: this.getPrivilegeRoleSchema(['R','W']),
        mode: ['edit', 'create'], uniqueCol : ['grantee'],
        canAdd: true, canDelete: true,
      },
      {
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },
      );
    }
    return fields;
  }

  validate(state, setError) {
    let errmsg = null;

    if (this.isNew() && isEmptyString(state.path)) {
      errmsg = gettext('\'Location\' cannot be empty.');
      setError('path', errmsg);
      return true;
    }
    return false;
  }
}
