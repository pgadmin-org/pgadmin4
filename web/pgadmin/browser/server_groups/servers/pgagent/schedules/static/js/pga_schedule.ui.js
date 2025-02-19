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
import { WEEKDAYS, MONTHS, HOURS, MINUTES, PGAGENT_MONTHDAYS } from '../../../../../../static/js/constants';
import { DaysSchema, TimesSchema } from './repeat.ui';

export class ExceptionsSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      jexdate: null,
      jextime: null,
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'jexid';
  }

  get baseFields() {
    return [
      {
        id: 'jexdate', cell: 'datetimepicker', label: gettext('Date'),
        type: 'datetimepicker',
        controlProps: { placeholder: gettext('<any>'),
          autoOk: true, pickerType: 'Date',
        },
      }, {
        id: 'jextime', cell: 'datetimepicker', label: gettext('Time'),
        type: 'datetimepicker',
        controlProps: { placeholder: gettext('<any>'),
          autoOk: true, pickerType: 'Time', ampm: false,
        },
      }
    ];
  }

  validate(state, setError) {
    let d = (state.jexdate || '<any>'),
      t = (state.jextime || '<any>');

    if (d == t && d == '<any>') {
      setError('jscdate', gettext('Please specify date/time.'));
      return true;
    } else {
      setError('jscdate', null);
    }
  }
}

export default class PgaJobScheduleSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      jscid: null,
      jscjobid: null,
      jscname: '',
      jscdesc: '',
      jscenabled: true,
      jscstart: null,
      jscend: null,
      jscweekdays: _.map(WEEKDAYS, function() { return false; }),
      jscmonthdays: _.map(PGAGENT_MONTHDAYS, function() { return false; }),
      jscmonths: _.map(MONTHS, function() { return false; }),
      jschours: _.map(HOURS, function() { return false; }),
      jscminutes: _.map(MINUTES, function() { return false; }),
      jscexceptions: [],
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'jscid';
  }

  customFromRaw(originalValue, options) {
    if (!_.isNull(originalValue) && !_.isUndefined(originalValue) && Array.isArray(originalValue)) {
      let retValue = '';
      originalValue.forEach( function (value, index) {
        if (value) {
          retValue = retValue + options[index].label + ', ';
        }
      });

      retValue = retValue.replace(/,\s*$/, '');
      return retValue;
    }

    return originalValue;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'jscid', label: gettext('ID'), type: 'int', mode: ['properties'],
      }, {
        id: 'jscname', label: gettext('Name'), type: 'text', noEmpty: true, cell: 'text',
      }, {
        id: 'jscenabled', label: gettext('Enabled?'), type: 'switch', cell: 'switch',
      }, {
        id: 'jscstart', label: gettext('Start'), type: 'datetimepicker', cell: 'datetimepicker',
        controlProps: { ampm: false,
          placeholder: gettext('YYYY-MM-DD HH:mm:ss Z'), autoOk: true,
          disablePast: true,
        },
      }, {
        id: 'jscend', label: gettext('End'), type: 'datetimepicker', cell: 'datetimepicker',
        controlProps: { ampm: false,
          placeholder: gettext('YYYY-MM-DD HH:mm:ss Z'), autoOk: true,
          disablePast: true,
        },
      }, {
        type: 'note', mode: ['create', 'edit'], group: gettext('Repeat'),
        text: [
          '<ul><li>',
          gettext('Schedules are specified using a '),
          '<strong>', gettext('cron-style'), '</strong>',
          'format.',
          '</li><li>',
          gettext('For each selected time or date element, the schedule will execute.'),
          '</li><li>',
          gettext('e.g. To execute at 5 minutes past every hour, simply select ‘05’ in the Minutes list box.'),
          '</li><li>',
          gettext('Values from more than one field may be specified in order to further control the schedule.'),
          '</li><li>',
          gettext('e.g. To execute at 12:05 and 14:05 every Monday and Thursday, you would click minute 05, hours 12 and 14, and weekdays Monday and Thursday.'),
          '</li><li>',
          gettext('For additional flexibility, the Month Days check list includes an extra Last Day option. This matches the last day of the month, whether it happens to be the 28th, 29th, 30th or 31st.'),
          '</li></ul>',
        ].join(''),
      }, {
        id: 'jscweekdays', label: gettext('Week days'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, WEEKDAYS);
            }
          },
        }
      }, {
        id: 'jscmonthdays', label: gettext('Month days'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, PGAGENT_MONTHDAYS);
            }
          },
        }
      }, {
        id: 'jscmonths', label: gettext('Months'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, MONTHS);
            }
          },
        }
      }, {
        id: 'jschours', label: gettext('Hours'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, HOURS);
            }
          },
        }
      }, {
        id: 'jscminutes', label: gettext('Minutes'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, MINUTES);
            }
          },
        }
      }, {
        type: 'nested-fieldset', mode: ['create','edit'],
        label: gettext('Days'), group: gettext('Repeat'),
        schema : new DaysSchema(),
      }, {
        type: 'nested-fieldset', mode: ['create','edit'],
        label: gettext('Times'), group: gettext('Repeat'),
        schema : new TimesSchema(),
      }, {
        id: 'jscexceptions', label: gettext('Exceptions'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=>{
              let exceptions = '';
              if (!_.isNull(backendVal) && !_.isUndefined(backendVal) && Array.isArray(backendVal)) {
                backendVal.forEach( function (ex, index, array) {
                  exceptions = exceptions + '[' + ex.jexdate + (ex.jextime ? ' ' + ex.jextime + ']': ']');
                  if (index !== (array.length -1)) {
                    exceptions = exceptions + ', ';
                  }
                });
              }
              return exceptions;
            }
          }
        }
      }, {
        id: 'jscexceptions', type: 'collection', mode: ['edit', 'create'],
        schema: new ExceptionsSchema(), group: gettext('Exceptions'),
        canEdit: false, canAdd: true, canDelete: true,
        uniqueCol : ['jexdate', 'jextime'],
      }, {
        id: 'jscdesc', label: gettext('Comment'), type: 'multiline',
      }
    ];
  }

  validate(state, setError) {
    if (isEmptyString(state.jscstart)) {
      setError('jscstart', gettext('Please enter the start time.'));
      return true;
    } else {
      setError('jscstart', null);
    }

    if (!isEmptyString(state.jscend)) {
      let start_time = state.jscstart,
        end_time = state.jscend,
        start_time_js =  start_time.split(' '),
        end_time_js =  end_time.split(' ');

      start_time_js = moment(start_time_js[0] + ' ' + start_time_js[1]);
      end_time_js = moment(end_time_js[0] + ' ' + end_time_js[1]);

      if(end_time_js.isBefore(start_time_js)) {
        setError('jscend', gettext('Start time must be less than end time'));
        return true;
      } else {
        setError('jscend', null);
      }
    } else {
      state.jscend = null;
    }
  }
}
