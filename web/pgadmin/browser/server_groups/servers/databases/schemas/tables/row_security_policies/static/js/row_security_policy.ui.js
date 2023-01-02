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


export default class RowSecurityPolicySchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      policyowner: 'public',
      event: 'ALL',
      using: undefined,
      using_orig: undefined,
      withcheck: undefined,
      withcheck_orig: undefined,
      type:'PERMISSIVE',
      ...initValues
    });

    this.fieldOptions = {
      role: [],
      function_names: [],
      ...fieldOptions,
    };

    this.nodeInfo = this.fieldOptions.nodeInfo;

  }

  get idAttribute() {
    return 'oid';
  }

  disableUsingField(state){
    return state.event == 'INSERT';
  }

  disableWithCheckField(state){
    let event = state.event;
    if ((event == 'SELECT') || (event == 'DELETE')){
      state.withcheck = '';
      return true;
    }
    return false;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        editable: true, type: 'text', readonly: false,
        noEmpty: true
      },{
        id: 'oid', label: gettext('OID'), cell: 'string',
        editable: false, type: 'text', mode: ['properties'],
      },
      {
        id: 'event', label: gettext('Event'), type: 'select',
        group: gettext('Commands'),disabled: () => {
          return !obj.isNew();
        },
        controlProps: { allowClear: false },
        options:[
          {label: 'ALL', value: 'ALL'},
          {label: 'SELECT', value: 'SELECT'},
          {label: 'INSERT', value: 'INSERT'},
          {label: 'UPDATE', value: 'UPDATE'},
          {label: 'DELETE', value: 'DELETE'},
        ],
      },
      {
        id: 'using', label: gettext('Using'), deps: ['using', 'event'],
        type: 'text', disabled: obj.disableUsingField,
        mode: ['create', 'edit', 'properties'],
        control: 'sql', visible: true, group: gettext('Commands'),
      },
      {
        id: 'withcheck', label: gettext('With check'), deps: ['withcheck', 'event'],
        type: 'text', mode: ['create', 'edit', 'properties'],
        control: 'sql', visible: true, group: gettext('Commands'),
        disabled: obj.disableWithCheckField,
      },
      {
        id: 'rls_expression_key_note', label: gettext('RLS policy expression'),
        type: 'note', group: gettext('Commands'), mode: ['create', 'edit'],
        text: [
          '<ul><li>',
          '<strong>', gettext('Using: '), '</strong>',
          gettext('This expression will be added to queries that refer to the table if row level security is enabled. Rows for which the expression returns true will be visible. Any rows for which the expression returns false or null will not be visible to the user (in a SELECT), and will not be available for modification (in an UPDATE or DELETE). Such rows are silently suppressed; no error is reported.'),
          '</li><li>',
          '<strong>', gettext('With check: '), '</strong>',
          gettext('This expression will be used in INSERT and UPDATE queries against the table if row level security is enabled. Only rows for which the expression evaluates to true will be allowed. An error will be thrown if the expression evaluates to false or null for any of the records inserted or any of the records that result from the update.'),
          '</li></ul>',
        ].join(''),
      },
      {
        id: 'policyowner', label: gettext('Role'), cell: 'text',
        type: 'select',
        options: obj.fieldOptions.role,
        controlProps: { allowClear: false }
      },
      {
        id: 'type', label: gettext('Type'), type: 'select', deps:['type'],
        disabled: () => {return !obj.isNew();},
        controlProps: {
          width: '100%',
          allowClear: false,
        },
        options:[
          {label: 'PERMISSIVE', value: 'PERMISSIVE'},
          {label: 'RESTRICTIVE', value: 'RESTRICTIVE'},
        ],
        visible: () => {
          return obj.nodeInfo.server.version >= 100000;
        },
      },
    ];
  }
}
