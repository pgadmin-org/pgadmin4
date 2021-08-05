/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../static/js/sec_label.ui';

export default class CatalogSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues) {
    super({
      name: undefined,
      namespaceowner: undefined,
      nspacl: undefined,
      is_sys_obj: undefined,
      description: undefined,
      securitylabel: [],
      ...initValues
    });
    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'string',
        type: 'text', readonly: true,
      },{
        id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
        type: 'text',
      },{
        id: 'namespaceowner', label: gettext('Owner'), cell: 'string',
        type: 'text', readonly: true,
      },{
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'is_sys_obj', label: gettext('System catalog?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      },{
        id: 'description', label: gettext('Comment'), cell: 'string',
        type: 'multiline',
      },{
        id: 'seclabels', label: gettext('Security labels'),
        schema: new SecLabelSchema(),
        editable: false, type: 'collection',
        group: gettext('Security'), mode: ['edit', 'create'],
        min_version: 90200,
        canAdd: false, canEdit: false, canDelete: false,
      },
    ];
  }
}
