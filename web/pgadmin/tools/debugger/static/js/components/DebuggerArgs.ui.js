/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

class ArgementsCollectionSchema extends BaseUISchema {
  constructor() {
    super({
      name: undefined,
      type: undefined,
      is_null: false,
      expr: false,
      value: undefined,
      use_default: false,
      default_value: undefined,
    });

    this.isValid = true;
  }

  get baseFields() {
    return [
      {
        id: 'name',
        label: gettext('Name'),
        editable: false,
        type: 'text',
        cell: '',
      },
      {
        id: 'type',
        label: gettext('Type'),
        editable: false,
        type: 'text',
        cell: '',
        width: 30
      },
      {
        id: 'is_null',
        label: gettext('Null?'),
        type: 'checkbox',
        cell: 'checkbox',
        width: 38,
        align_center: true,
      },
      {
        id: 'expr',
        label: gettext('Expression?'),
        type: 'checkbox',
        cell: 'checkbox',
        width: 60,
        align_center: true,
      },
      {
        id: 'value',
        label: gettext('Value'),
        type: 'text',
        cell: (state) => {
          let dtype = 'text';
          if(state.type == 'date') {
            dtype = 'datetimepicker';
          } else if(state.type == 'numeric') {
            dtype = 'numeric';
          }

          return {
            cell: dtype,
            controlProps: {
              ...(dtype=='datetimepicker' && {
                placeholder: gettext('YYYY-MM-DD'),
                autoOk: true, pickerType: 'Date', ampm: false,
              })
            }
          };
        },
        editable: true,
        align_center: true,
      },
      {
        id: 'use_default',
        label: gettext('Use Default?'),
        type: 'checkbox',
        cell: 'checkbox',
        width: 62,
        disabled: (state) => {return state.disable_use_default;}
      },
      {
        id: 'default_value',
        label: gettext('Default'),
        type: 'text',
        editable: false,
        cell: '',
      },
    ];
  }

}

export class DebuggerArgumentSchema extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [{
      id: 'aregsCollection', label: gettext(''),
      mode: ['edit'],
      type: 'collection',
      canAdd: false,
      canDelete: false,
      canEdit: false,
      editable: false,
      disabled: false,
      schema: new ArgementsCollectionSchema(),
    }];
  }
}
