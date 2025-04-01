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
import moment from 'moment';
import { getRepeatSchema } from '../../../static/js/dbms_job_scheduler_common.ui';

export default class DBMSScheduleSchema extends BaseUISchema {
  constructor() {
    super({
      jsscid: null,
      jsscname: '',
      jsscstart: null,
      jsscend: null,
      jsscdesc: '',
      jsscrepeatint: '',
      jsscfreq: null,
      jsscdate: null,
      jsscweekdays: null,
      jsscmonthdays: null,
      jsscmonths: null,
      jsschours: null,
      jsscminutes: null,
    });
  }

  get idAttribute() {
    return 'jsscid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'jsscid', label: gettext('ID'), type: 'int', mode: ['properties'],
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsscname', label: gettext('Name'), cell: 'text',
        editable: false, type: 'text', noEmpty: true,
        readonly: function(state) {return !obj.isNew(state); },
      },
      // Add the Repeat Schema.
      ...getRepeatSchema(obj, 'schedule'),
      {
        id: 'jsscdesc', label: gettext('Comment'), type: 'multiline',
        readonly: function(state) {return !obj.isNew(state); },
      },
    ];
  }

  validate(state, setError) {
    if (isEmptyString(state.jsscstart) && isEmptyString(state.jsscfreq) &&
        isEmptyString(state.jsscmonths) && isEmptyString(state.jsscweekdays) &&
        isEmptyString(state.jsscmonthdays) && isEmptyString(state.jsschours) &&
        isEmptyString(state.jsscminutes) && isEmptyString(state.jsscdate)) {
      setError('jsscstart', gettext('Either Start time or Repeat interval must be specified.'));
      return true;
    } else {
      setError('jsscstart', null);
    }

    if (!isEmptyString(state.jsscend)) {
      let start_time = state.jsscstart,
        end_time = state.jsscend,
        start_time_js =  start_time.split(' '),
        end_time_js =  end_time.split(' ');

      start_time_js = moment(start_time_js[0] + ' ' + start_time_js[1]);
      end_time_js = moment(end_time_js[0] + ' ' + end_time_js[1]);

      if(end_time_js.isBefore(start_time_js)) {
        setError('jsscend', gettext('Start time must be less than end time'));
        return true;
      } else {
        setError('jsscend', null);
      }
    } else {
      state.jsscend = null;
    }
  }
}
