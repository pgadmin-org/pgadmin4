/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';

export default class OperatorSchema extends BaseUISchema {
  constructor(fieldOptions = {},initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      description: undefined,
      schema: null,
      lefttype: undefined,
      righttype: undefined,
      operproc:undefined,
      joinproc: undefined,
      restrproc: undefined,
      commutator: undefined,
      negator:undefined,
      support_hash: false,
      support_merge: false,
      ...initValues
    });
    this.fieldOptions = fieldOptions;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), type: 'tel',
        readonly: true,
      },
      {
        id: 'oid', label: gettext('OID'),
        type: 'text', mode: ['properties']
      },
      {
        id: 'owner', label: gettext('Owner'),
        type: 'text', readonly: true,
      },
      {
        id: 'schema', label: gettext('Schema'),
        mode: ['create', 'edit'],
        type: 'text', readonly: true,
      },
      {
        id: 'is_sys_obj', label: gettext('System operator?'),
        cell: 'boolean', type: 'switch', mode: ['properties'],
      },
      {
        id: 'description', label: gettext('Comment'),
        type: 'multiline', mode: ['properties', 'create', 'edit'],
        readonly: true,
      },
      {
        id: 'lefttype', label: gettext('Left type'),
        group: gettext('Definition'),
        type: 'text', readonly: true,
      },
      {
        id: 'righttype', label: gettext('Right type'),
        group: gettext('Definition'),
        type: 'text', readonly: true,
      },
      {
        id: 'resulttype', label: gettext('Result type'),
        group: gettext('Definition'),
        type: 'text', mode: ['properties'],
      },
      {
        id: 'oprkind', label: gettext('Kind'),
        group: gettext('Definition'),
        type: 'text', mode: ['properties'],
      },
      {
        id: 'operproc', label: gettext('Operator function'),
        group: gettext('Definition'),
        type: 'text', readonly: true,
      },
      {
        id: 'restrproc', label: gettext('Restrict function'),
        group: gettext('Implementation'),
        type: 'text', readonly: true,
      },
      {
        id: 'joinproc', label: gettext('Join function'),
        group: gettext('Implementation'),
        type: 'text', readonly: true,
      },
      {
        id: 'commutator', label: gettext('Commutator'),
        group: gettext('Implementation'),
        type: 'text', readonly: true,
      },
      {
        id: 'negator', label: gettext('Negator'),
        group: gettext('Implementation'),
        type: 'text', readonly: true,
      },
      {
        id: 'support_hash', label: gettext('Supports hash'),
        group: gettext('Implementation'),
        cell: 'boolean', type: 'switch', readonly: true,
      },
      {
        id: 'support_merge', label: gettext('Supports merge'),
        group: gettext('Implementation'),
        cell: 'boolean', type: 'switch', readonly: true,
      }
    ];
  }
}

