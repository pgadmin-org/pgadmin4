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


export default class RuleSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super({
      oid: undefined,
      name: undefined,
      schema: undefined
    });

    this.fieldOptions = {
      nodeInfo: undefined,
      nodeData: undefined,
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
        id: 'name', label: gettext('Name'),
        type: 'text', disabled: (state) => {
          // disable name field it it is system rule
          if (state.name == '_RETURN') {
            return true;
          }
          return !(obj.isNew(state) || obj.fieldOptions.nodeInfo.server.version >= 90400);
        }, noEmpty: true
      },
      {
        id: 'oid', label: gettext('OID'),
        type: 'text', mode: ['properties'],
      },
      {
        id: 'schema', label:'',
        type: 'text', visible: false, disabled: (state) => {
          // It is used while generating sql
          state.schema = obj.fieldOptions.nodeInfo.schema.label;
        },
      },
      {
        id: 'view', label:'',
        type: 'text', visible: false, disabled: (state) => {
          // It is used while generating sql
          state.view = obj.fieldOptions.nodeData.label;
        },
      },
      {
        id: 'is_enable_rule', label: gettext('Rule enabled?'),
        mode: ['edit', 'properties'], group: gettext('Definition'),
        type: 'select',
        disabled: () => {
          return 'catalog' in obj.fieldOptions.nodeInfo || 'view' in obj.fieldOptions.nodeInfo;
        },
        options: [
          {label: gettext('Enable'), value: 'O'},
          {label: gettext('Enable Replica'), value: 'R'},
          {label: gettext('Enable Always'), value: 'A'},
          {label: gettext('Disable'), value: 'D'},
        ],
        controlProps: { allowClear: false },
      },
      {
        id: 'event', label: gettext('Event'), control: 'select2',
        group: gettext('Definition'), type: 'select',
        controlProps: { allowClear: false },
        options:[
          {label: 'SELECT', value: 'SELECT'},
          {label: 'INSERT', value: 'INSERT'},
          {label: 'UPDATE', value: 'UPDATE'},
          {label: 'DELETE', value: 'DELETE'},
        ],
      },
      {
        id: 'do_instead', label: gettext('Do instead?'), group: gettext('Definition'),
        type: 'switch',
      },
      {
        id: 'condition', label: gettext('Condition'),
        type: 'sql', isFullTab: true, group: gettext('Condition'),

      },
      {
        id: 'statements', label: gettext('Commands'),
        type: 'sql', isFullTab: true, group: gettext('Commands'),
      },
      {
        id: 'system_rule', label: gettext('System rule?'),
        type: 'switch', mode: ['properties'],
      },
      {
        id: 'comment', label: gettext('Comment'), cell: 'text', type: 'multiline',
      },
    ];
  }
}
