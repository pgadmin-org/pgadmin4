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
import { isEmptyString } from 'sources/validators';
import { getActionSchema } from '../../../static/js/dbms_job_scheduler_common.ui';

export default class DBMSProgramSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super({
      jsprid: null,
      jsprname: '',
      jsprtype: 'PLSQL_BLOCK',
      jsprenabled: true,
      jsprnoofargs: 0,
      jsprarguments: [],
      jsprdesc: '',
      jsprproc: null,
      jsprcode: null,
    });
    this.fieldOptions = {
      procedures: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'jsprid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'jsprid', label: gettext('ID'), type: 'int', mode: ['properties'],
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsprname', label: gettext('Name'), cell: 'text',
        type: 'text', noEmpty: true,
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsprenabled', label: gettext('Enabled?'), type: 'switch', cell: 'switch',
        readonly: function(state) {return !obj.isNew(state); },
      },
      // Add the Action Schema
      ...getActionSchema(obj, 'program'),
      {
        id: 'jsprdesc', label: gettext('Comment'), type: 'multiline',
        readonly: function(state) {return !obj.isNew(state); },
      }
    ];
  }
  validate(state, setError) {
    /* code validation*/
    if (state.jsprtype == 'PLSQL_BLOCK' && isEmptyString(state.jsprcode)) {
      setError('jsprcode', gettext('Code cannot be empty.'));
      return true;
    } else {
      setError('jsprcode', null);
    }

    if (state.jsprtype == 'STORED_PROCEDURE' && isEmptyString(state.jsprproc)) {
      setError('jsprproc', gettext('Procedure cannot be empty.'));
      return true;
    } else {
      setError('jsprproc', null);
    }
  }
}
