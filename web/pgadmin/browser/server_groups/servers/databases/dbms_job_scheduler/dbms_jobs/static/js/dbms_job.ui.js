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
import { getActionSchema, getRepeatSchema } from '../../../static/js/dbms_job_scheduler_common.ui';


export default class DBMSJobSchema extends BaseUISchema {
  constructor(fieldOptions={}) {
    super({
      jsjobid: null,
      jsjobname: '',
      jsjobenabled: true,
      jsjobdesc: '',
      jsjobtype: 's',
      jsjobruncount: 0,
      jsjobfailurecount: 0,
      // Program Args
      jsjobprname: '',
      jsprtype: 'PLSQL_BLOCK',
      jsprenabled: true,
      jsprnoofargs: 0,
      jsprproc: null,
      jsprcode: null,
      jsprarguments: [],
      // Schedule args
      jsjobscname: '',
      jsscstart: null,
      jsscend: null,
      jsscrepeatint: '',
      jsscfreq: null,
      jsscdate: null,
      jsscweekdays: null,
      jsscmonthdays: null,
      jsscmonths: null,
      jsschours: null,
      jsscminutes: null,
    });
    this.fieldOptions = {
      procedures: [],
      programs: [],
      schedules: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'jsjobid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'jsjobid', label: gettext('ID'), type: 'int', mode: ['properties'],
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsjobname', label: gettext('Name'), cell: 'text',
        editable: false, type: 'text', noEmpty: true,
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsjobenabled', label: gettext('Enabled?'), type: 'switch', cell: 'switch',
        readonly: function(state) {return !obj.isNew(state); },
      }, {
        id: 'jsjobtype', label: gettext('Job Type'),
        type: ()=>{
          let options = [
            {'label': gettext('SELF-CONTAINED'), 'value': 's'},
            {'label': gettext('PRE-DEFINED'), 'value': 'p'},
          ];
          return {
            type: 'toggle',
            options: options,
          };
        },
        readonly: function(state) {return !obj.isNew(state); },
        helpMessage: gettext('If the Job Type is Self-Contained you need to specify the action and repeat interval in the Action and Repeat tabs respectively. If the Job Type is Pre-Defined you need to specify the existing Program and Schedule names in the Pre-Defined tab.'),
        helpMessageMode: ['create'],
      }, {
        id: 'jsjobruncount', label: gettext('Run Count'), type: 'int',
        readonly: true, mode: ['edit', 'properties']
      }, {
        id: 'jsjobfailurecount', label: gettext('Failure Count'), type: 'int',
        readonly: true, mode: ['edit', 'properties']
      }, {
        id: 'jsjobdesc', label: gettext('Comment'), type: 'multiline',
        readonly: function(state) {return !obj.isNew(state); },
      },
      // Add the Action Schema
      ...getActionSchema(obj, 'job'),
      // Add the Repeat Schema.
      ...getRepeatSchema(obj, 'job'),
      {
        id: 'jsjobprname', label: gettext('Program Name'), type: 'select',
        controlProps: { allowClear: false}, group: gettext('Pre-Defined'),
        options: this.fieldOptions.programs,
        readonly: function(state) {
          return !obj.isNew(state) || state.jsjobtype == 's';
        },
        deps: ['jsjobtype'],
        depChange: (state) => {
          if (state.jsjobtype == 's') {
            return { jsjobprname: null };
          }
        }
      }, {
        id: 'jsjobscname', label: gettext('Schedule Name'), type: 'select',
        controlProps: { allowClear: false}, group: gettext('Pre-Defined'),
        options: this.fieldOptions.schedules,
        readonly: function(state) {
          return !obj.isNew(state) || state.jsjobtype == 's';
        },
        deps: ['jsjobtype'],
        depChange: (state) => {
          if (state.jsjobtype == 's') {
            return { jsjobscname: null };
          }
        }
      },
    ];
  }

  validate(state, setError) {
    if (state.jsjobtype == 's' ) {
      if (isEmptyString(state.jsprtype)) {
        setError('jsprtype', gettext('Job Type cannot be empty.'));
        return true;
      } else {
        setError('jsprtype', null);
      }

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
    } else if (state.jsjobtype == 'p') {
      if (isEmptyString(state.jsjobprname)) {
        setError('jsjobprname', gettext('Pre-Defined program name cannot be empty.'));
        return true;
      } else {
        setError('jsjobprname', null);
      }
      if (isEmptyString(state.jsjobscname)) {
        setError('jsjobscname', gettext('Pre-Defined schedule name cannot be empty.'));
        return true;
      } else {
        setError('jsjobscname', null);
      }
    }
  }
}
