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
import SecLabelSchema from '../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';


export default class EventTriggerSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      oid: undefined,
      name: undefined,
      eventowner: undefined,
      is_sys_obj: undefined,
      comment: undefined,
      enabled: 'O',
      eventfuncoid: undefined,
      eventfunname: undefined,
      eventname: 'DDL_COMMAND_START',
      when: undefined,
      xmin: undefined,
      source: undefined,
      language: undefined,
      ...initValues
    });

    this.fieldOptions = {
      role: [],
      function_names: [],
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }


  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', noEmpty: true
      },
      {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      },{
        id: 'eventowner', label: gettext('Owner'),
        type: 'select', mode: ['properties', 'edit','create'], node: 'role',
        options: this.fieldOptions.role
      },
      {
        id: 'is_sys_obj', label: gettext('System event trigger?'),
        cell:'switch', type: 'switch',
        mode: ['properties'],
      },
      {
        id: 'comment', label: gettext('Comment'), type: 'multiline',
      },{
        id: 'enabled', label: gettext('Trigger enabled?'),
        group: gettext('Definition'), mode: ['properties', 'edit','create'],
        options: [
          {label: gettext('Enable'), value: 'O'},
          {label: gettext('Disable'), value: 'D'},
          {label: gettext('Replica'), value: 'R'},
          {label: gettext('Always'), value: 'A'},
        ],
        type: 'select', controlProps: { allowClear: false, width: '100%' },
      },{
        id: 'eventfunname', label: gettext('Trigger function'),
        type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.function_names
      },{
        id: 'eventname', label: gettext('Event'),
        group: gettext('Definition'), cell: 'text',
        options: [
          {label: gettext('DDL COMMAND START'), value: 'DDL_COMMAND_START'},
          {label: gettext('DDL COMMAND END'), value: 'DDL_COMMAND_END'},
          {label: gettext('SQL DROP'), value: 'SQL_DROP'},
        ],
        type: 'select', controlProps: { allowClear: false, width: '100%' },
      },
      {
        id: 'when', label: gettext('When TAG in'),  cell: 'string',
        type: 'sql', group: gettext('Definition'),
        controlProps: {className:['custom_height_css_class']},
      },
      {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {

      /* Event function name validation*/
      if (isEmptyString(state.eventfunname)) {
        errmsg = gettext('Event trigger function cannot be empty.');
        setError('eventfunname', errmsg);
        return true;
      } else {
        setError('eventfunname', null);
      }

    } else {
      _.each(['eventfunname'], (item) => {
        setError(item, null);
      });
    }
  }
}
