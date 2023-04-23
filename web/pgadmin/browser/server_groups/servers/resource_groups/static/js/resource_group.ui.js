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
import { emptyValidator } from '../../../../../../static/js/validators';

export default class ResourceGroupSchema extends BaseUISchema {
  constructor(initValues) {
    super({
      oid: undefined,
      name: undefined,
      is_sys_obj: undefined,
      cpu_rate_limit: 0.0,
      dirty_rate_limit: 0.0,
      ...initValues,
    });
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'oid', label: gettext('OID'), type: 'text',
        editable: false, mode:['properties'],
      }, {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', noEmpty: true
      }, {
        id: 'is_sys_obj', label: gettext('System resource group?'),
        type: 'switch', mode: ['properties'],
      }, {
        id: 'cpu_rate_limit', label: gettext('CPU rate limit (percentage)'),
        type: 'numeric', min:0, max:16777216,
      }, {
        id: 'dirty_rate_limit', label: gettext('Dirty rate limit (KB)'),
        type: 'numeric', min:0, max:16777216,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    errmsg = emptyValidator('CPU rate limit', state.cpu_rate_limit);
    if (errmsg) {
      setError('cpu_rate_limit', errmsg);
      return true;
    } else {
      setError('cpu_rate_limit', errmsg);
    }

    errmsg = emptyValidator('Dirty rate limit', state.dirty_rate_limit);
    if (errmsg) {
      setError('dirty_rate_limit', errmsg);
      return true;
    } else {
      setError('dirty_rate_limit', errmsg);
    }

    return null;
  }
}
