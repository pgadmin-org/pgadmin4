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

export default class EDBFuncSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      funcowner: undefined,
      pronargs: undefined, /* Argument Count */
      proargs: undefined, /* Arguments */
      proargtypenames: undefined, /* Argument Signature */
      prorettypename: undefined, /* Return Type */
      lanname: 'sql', /* Language Name in which function is being written */
      prosrc: undefined,
      proacl: undefined,
      visibility: 'Unknown',
      warn_text: undefined,
      ...initValues
    });
    this.fieldOptions = {
      ...fieldOptions
    };
  }

  isVisible(state) {
    return state.name == 'sysfunc' || state.name == 'sysproc';
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      type: 'text', mode: ['properties'],
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'funcowner', label: gettext('Owner'), cell: 'string',
      type: 'text', readonly: true,
    },{
      id: 'pronargs', label: gettext('Argument count'), cell: 'string',
      type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'proargs', label: gettext('Arguments'), cell: 'string',
      type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'proargtypenames', label: gettext('Signature arguments'), cell:
      'string', type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'prorettypename', label: gettext('Return type'), cell: 'string',
      type: 'text', group: gettext('Definition'),
      mode: ['properties'], visible: (state) => this.isVisible(state),
    },{
      id: 'visibility', label: gettext('Visibility'), cell: 'string',
      type: 'text', mode: ['properties'],
    },{
      id: 'lanname', label: gettext('Language'), cell: 'string',
      type: 'text', group: gettext('Definition'), readonly: true,
    },{
      id: 'prosrc', label: gettext('Code'), cell: 'string',
      mode: ['properties'],
      group: gettext('Code'),
      type: 'sql', isFullTab: true,
      visible: function(state) {
        return state.lanname !== 'c';
      },
      disabled: true,
    }];
  }
}
