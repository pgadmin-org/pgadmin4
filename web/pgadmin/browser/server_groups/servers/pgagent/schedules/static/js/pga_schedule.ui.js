/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';
import moment from 'moment';

const weekdays = [
    {label: gettext('Sunday'), value: 'Sunday'},
    {label: gettext('Monday'), value: 'Monday'},
    {label: gettext('Tuesday'), value: 'Tuesday'},
    {label: gettext('Wednesday'), value: 'Wednesday'},
    {label: gettext('Thursday'), value: 'Thursday'},
    {label: gettext('Friday'), value: 'Friday'},
    {label: gettext('Saturday'), value: 'Saturday'},
  ],
  monthdays = [
    {label: gettext('1st'), value: '1st'}, {label: gettext('2nd'), value: '2nd'},
    {label: gettext('3rd'), value: '3rd'}, {label: gettext('4th'), value: '4th'},
    {label: gettext('5th'), value: '5th'}, {label: gettext('6th'), value: '6th'},
    {label: gettext('7th'), value: '7th'}, {label: gettext('8th'), value: '8th'},
    {label: gettext('9th'), value: '9th'}, {label: gettext('10th'), value: '10th'},
    {label: gettext('11th'), value: '11th'}, {label: gettext('12th'), value: '12th'},
    {label: gettext('13th'), value: '13th'}, {label: gettext('14th'), value: '14th'},
    {label: gettext('15th'), value: '15th'}, {label: gettext('16th'), value: '16th'},
    {label: gettext('17th'), value: '17th'}, {label: gettext('18th'), value: '18th'},
    {label: gettext('19th'), value: '19th'}, {label: gettext('20th'), value: '20th'},
    {label: gettext('21st'), value: '21st'}, {label: gettext('22nd'), value: '22nd'},
    {label: gettext('23rd'), value: '23rd'}, {label: gettext('24th'), value: '24th'},
    {label: gettext('25th'), value: '25th'}, {label: gettext('26th'), value: '26th'},
    {label: gettext('27th'), value: '27th'}, {label: gettext('28th'), value: '28th'},
    {label: gettext('29th'), value: '29th'}, {label: gettext('30th'), value: '30th'},
    {label: gettext('31st'), value: '31st'}, {label: gettext('Last day'), value: 'Last Day'},
  ],
  months = [
    {label: gettext('January'),value: 'January'}, {label: gettext('February'),value: 'February'},
    {label: gettext('March'), value: 'March'}, {label: gettext('April'), value: 'April'},
    {label: gettext('May'), value: 'May'}, {label: gettext('June'), value: 'June'},
    {label: gettext('July'), value: 'July'}, {label: gettext('August'), value: 'August'},
    {label: gettext('September'), value: 'September'}, {label: gettext('October'), value: 'October'},
    {label: gettext('November'), value: 'November'}, {label: gettext('December'), value: 'December'},
  ],
  hours = [
    {label: gettext('00'), value: '00'}, {label: gettext('01'), value: '01'}, {label: gettext('02'), value: '02'}, {label: gettext('03'), value: '03'},
    {label: gettext('04'), value: '04'}, {label: gettext('05'), value: '05'}, {label: gettext('06'), value: '06'}, {label: gettext('07'), value: '07'},
    {label: gettext('08'), value: '08'}, {label: gettext('09'), value: '09'}, {label: gettext('10'), value: '10'}, {label: gettext('11'), value: '11'},
    {label: gettext('12'), value: '12'}, {label: gettext('13'), value: '13'}, {label: gettext('14'), value: '14'}, {label: gettext('15'), value: '15'},
    {label: gettext('16'), value: '16'}, {label: gettext('17'), value: '17'}, {label: gettext('18'), value: '18'}, {label: gettext('19'), value: '19'},
    {label: gettext('20'), value: '20'}, {label: gettext('21'), value: '21'}, {label: gettext('22'), value: '22'}, {label: gettext('23'), value: '23'},
  ],
  minutes = [
    {label: gettext('00'), value: '00'}, {label: gettext('01'), value: '01'}, {label: gettext('02'), value: '02'}, {label: gettext('03'), value: '03'},
    {label: gettext('04'), value: '04'}, {label: gettext('05'), value: '05'}, {label: gettext('06'), value: '06'}, {label: gettext('07'), value: '07'},
    {label: gettext('08'), value: '08'}, {label: gettext('09'), value: '09'}, {label: gettext('10'), value: '10'}, {label: gettext('11'), value: '11'},
    {label: gettext('12'), value: '12'}, {label: gettext('13'), value: '13'}, {label: gettext('14'), value: '14'}, {label: gettext('15'), value: '15'},
    {label: gettext('16'), value: '16'}, {label: gettext('17'), value: '17'}, {label: gettext('18'), value: '18'}, {label: gettext('19'), value: '19'},
    {label: gettext('20'), value: '20'}, {label: gettext('21'), value: '21'}, {label: gettext('22'), value: '22'}, {label: gettext('23'), value: '23'},
    {label: gettext('24'), value: '24'}, {label: gettext('25'), value: '25'}, {label: gettext('26'), value: '26'}, {label: gettext('27'), value: '27'},
    {label: gettext('28'), value: '28'}, {label: gettext('29'), value: '29'}, {label: gettext('30'), value: '30'}, {label: gettext('31'), value: '31'},
    {label: gettext('32'), value: '32'}, {label: gettext('33'), value: '33'}, {label: gettext('34'), value: '34'}, {label: gettext('35'), value: '35'},
    {label: gettext('36'), value: '36'}, {label: gettext('37'), value: '37'}, {label: gettext('38'), value: '38'}, {label: gettext('39'), value: '39'},
    {label: gettext('40'), value: '40'}, {label: gettext('41'), value: '41'}, {label: gettext('42'), value: '42'}, {label: gettext('43'), value: '43'},
    {label: gettext('44'), value: '44'}, {label: gettext('45'), value: '45'}, {label: gettext('46'), value: '46'}, {label: gettext('47'), value: '47'},
    {label: gettext('48'), value: '48'}, {label: gettext('49'), value: '49'}, {label: gettext('50'), value: '50'}, {label: gettext('51'), value: '51'},
    {label: gettext('52'), value: '52'}, {label: gettext('53'), value: '53'}, {label: gettext('54'), value: '54'}, {label: gettext('55'), value: '55'},
    {label: gettext('56'), value: '56'}, {label: gettext('57'), value: '57'}, {label: gettext('58'), value: '58'}, {label: gettext('59'), value: '59'},
  ];

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

const BooleanArrayFormatter = {
  fromRaw: (originalValue, options) => {
    if (!_.isNull(originalValue) && !_.isUndefined(originalValue) && Array.isArray(originalValue)) {
      let retValue = [],
        index = 0;
      originalValue.forEach( function (value) {
        if (value) {
          retValue.push(options[index]);
        }
        index = index + 1;
      });

      return retValue;
    }

    return originalValue;
  },

  toRaw: (selectedVal, options)=> {
    if (!_.isNull(options) && !_.isUndefined(options) && Array.isArray(options)) {
      let retValue = [];
      options.forEach( function (option) {
        let elementFound = _.find(selectedVal, (selVal)=>_.isEqual(selVal.label, option.label));
        if(_.isUndefined(elementFound)) {
          retValue.push(false);
        } else {
          retValue.push(true);
        }
      });

      return retValue;
    }

    return selectedVal;
  }
};

export class DaysSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get baseFields() {
    return [
      {
        id: 'jscweekdays', label: gettext('Week Days'), type: 'select',
        group: gettext('Days'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the weekdays...'),
          formatter: BooleanArrayFormatter,
        },
        options: weekdays,
      }, {
        id: 'jscmonthdays', label: gettext('Month Days'), type: 'select',
        group: gettext('Days'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the month days...'),
          formatter: BooleanArrayFormatter,
        },
        options: monthdays,
      }, {
        id: 'jscmonths', label: gettext('Months'), type: 'select',
        group: gettext('Days'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the months...'),
          formatter: BooleanArrayFormatter,
        },
        options: months,
      }
    ];
  }
}

export class TimesSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      ...initValues,
    });

    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get baseFields() {
    return [
      {
        id: 'jschours', label: gettext('Hours'), type: 'select',
        group: gettext('Times'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the hours...'),
          formatter: BooleanArrayFormatter,
        },
        options: hours,
      }, {
        id: 'jscminutes', label: gettext('Minutes'), type: 'select',
        group: gettext('Times'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the minutes...'),
          formatter: BooleanArrayFormatter,
        },
        options: minutes,
      }
    ];
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
      jscweekdays: _.map(weekdays, function() { return false; }),
      jscmonthdays: _.map(monthdays, function() { return false; }),
      jscmonths: _.map(months, function() { return false; }),
      jschours: _.map(hours, function() { return false; }),
      jscminutes: _.map(minutes, function() { return false; }),
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
              return obj.customFromRaw(backendVal, weekdays);
            }
          },
        }
      }, {
        id: 'jscmonthdays', label: gettext('Month days'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, monthdays);
            }
          },
        }
      }, {
        id: 'jscmonths', label: gettext('Months'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, months);
            }
          },
        }
      }, {
        id: 'jschours', label: gettext('Hours'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, hours);
            }
          },
        }
      }, {
        id: 'jscminutes', label: gettext('Minutes'), type: 'text',
        mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (backendVal)=> {
              return obj.customFromRaw(backendVal, minutes);
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
