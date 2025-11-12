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
import { WEEKDAYS, MONTHDAYS, MONTHS, HOURS, MINUTES } from '../../../../../../static/js/constants';

function isReadOnly(obj, state, parentName) {
  // Always true in case of edit dialog
  if (!obj.isNew(state))
    return true;

  // Check the parent name and based on the condition return appropriate value.
  if (parentName == 'job') {
    return obj.isNew(state) && state.jsjobtype == 'p';
  }
  return false;
}


export function getRepeatSchema(obj, parentName) {
  return [
    {
      id: 'jsscrepeatint', label: gettext('Repeat Interval'), cell: 'text',
      readonly: true, type: 'multiline', mode: ['edit', 'properties'],
      group: gettext('Repeat'),
    }, {
      id: 'jsscstart', label: gettext('Start'), type: 'datetimepicker',
      cell: 'datetimepicker', group: gettext('Repeat'),
      controlProps: { ampm: false,
        placeholder: gettext('YYYY-MM-DD HH:mm:ss Z'), autoOk: true,
        disablePast: true,
      },
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscstart: null };
        }
      }
    }, {
      id: 'jsscend', label: gettext('End'), type: 'datetimepicker',
      cell: 'datetimepicker', group: gettext('Repeat'),
      controlProps: { ampm: false,
        placeholder: gettext('YYYY-MM-DD HH:mm:ss Z'), autoOk: true,
        disablePast: true,
      },
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscend: null };
        }
      }
    }, {
      id: 'jsscfreq', label: gettext('Frequency'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true,
        placeholder: gettext('Select the frequency...'),
      },
      options: [
        {'label': 'YEARLY', 'value': 'YEARLY'},
        {'label': 'MONTHLY', 'value': 'MONTHLY'},
        {'label': 'WEEKLY', 'value': 'WEEKLY'},
        {'label': 'DAILY', 'value': 'DAILY'},
        {'label': 'HOURLY', 'value': 'HOURLY'},
        {'label': 'MINUTELY', 'value': 'MINUTELY'},
      ],
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscfreq: null };
        }
      }
    }, {
      id: 'jsscdate', label: gettext('Date'), type: 'datetimepicker',
      cell: 'datetimepicker', group: gettext('Repeat'),
      controlProps: { ampm: false,
        placeholder: gettext('YYYYMMDD'), autoOk: true,
        disablePast: true, pickerType: 'Date', format: 'yyyyMMdd',
      },
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscdate: null };
        }
      }
    }, {
      id: 'jsscmonths', label: gettext('Months'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
        placeholder: gettext('Select the months...'),
      },
      options: MONTHS,
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscmonths: null };
        }
      }
    }, {
      id: 'jsscweekdays', label: gettext('Week Days'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
        placeholder: gettext('Select the weekdays...'),
      },
      options: WEEKDAYS,
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscweekdays: null };
        }
      }
    }, {
      id: 'jsscmonthdays', label: gettext('Month Days'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
        placeholder: gettext('Select the month days...'),
      },
      options: MONTHDAYS,
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscmonthdays: null };
        }
      }
    }, {
      id: 'jsschours', label: gettext('Hours'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
        placeholder: gettext('Select the hours...'),
      },
      options: HOURS,
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsschours: null };
        }
      }
    }, {
      id: 'jsscminutes', label: gettext('Minutes'), type: 'select',
      group: gettext('Repeat'),
      controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
        placeholder: gettext('Select the minutes...'),
      },
      options: MINUTES,
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsscminutes: null };
        }
      }
    }
  ];
}

export function getActionSchema(obj, parentName) {
  return [
    {
      id: 'jsprtype', label: gettext('Type'), type: 'select',
      controlProps: { allowClear: false}, group: gettext('Action'),
      options: [
        {'label': 'PLSQL BLOCK', 'value': 'PLSQL_BLOCK'},
        {'label': 'STORED PROCEDURE', 'value': 'STORED_PROCEDURE'},
      ],
      readonly: function(state) { return isReadOnly(obj, state, parentName); },
      deps:['jsjobtype'],
      depChange: (state) => {
        if (state.jsjobtype == 'p') {
          return { jsprtype: null };
        }
      }
    }, {
      id: 'jsprcode', label: gettext('Code'), type: 'sql',
      group: gettext('Code'), isFullTab: true,
      readonly: function(state) {
        return isReadOnly(obj, state, parentName) || state.jsprtype == 'STORED_PROCEDURE';
      },
      deps:['jsprtype', 'jsjobtype'],
      depChange: (state) => {
        if (obj.isNew(state) && (state.jsprtype == 'STORED_PROCEDURE' || state.jsjobtype == 'p')) {
          return { jsprcode: '' };
        }
      }
    },  {
      id: 'jsprproc', label: gettext('Procedure'), type: 'select',
      controlProps: { allowClear: false}, group: gettext('Action'),
      options: obj.fieldOptions.procedures,
      optionsLoaded: (options) => { obj.jsprocData = options; },
      readonly: function(state) {
        return isReadOnly(obj, state, parentName) || state.jsprtype == 'PLSQL_BLOCK';
      },
      deps:['jsprtype', 'jsjobtype'],
      depChange: (state) => {
        if (obj.isNew(state) && (state.jsprtype == 'PLSQL_BLOCK' || state.jsjobtype == 'p')) {
          return { jsprproc: null, jsprnoofargs : 0, jsprarguments: [] };
        }

        for(const option of obj.jsprocData) {
          if (option.label == state.jsprproc) {
            return { jsprnoofargs : option.no_of_args,
              jsprarguments: option.arguments};
          }
        }
      }
    }, {
      id: 'jsprnoofargs', label: gettext('Number of Arguments'),
      type: 'int', group: gettext('Action'), deps:['jsprtype'],
      readonly: true,
    }, {
      id: 'jsprarguments', label: gettext('Arguments'), cell: 'string',
      group: gettext('Arguments'), type: 'collection',
      canAdd: false, canDelete: false, canDeleteRow: false, canEdit: false,
      mode: ['create', 'edit'],
      columns: parentName == 'job' ? ['argname', 'argtype', 'argdefval', 'argval'] : ['argname', 'argtype', 'argdefval'],
      schema : new ProgramArgumentSchema(parentName),
    }
  ];
}

export class ProgramArgumentSchema extends BaseUISchema {
  constructor(parentName) {
    super();
    this.parentName = parentName;
  }

  get baseFields() {
    return[{
      id: 'argname', label: gettext('Name'), type: 'text',
      cell: '', readonly: true,
    }, {
      id: 'argtype', label: gettext('Data type'), type: 'text',
      cell: '', readonly: true,
    }, {
      id: 'argdefval', label: gettext('Default'), type: 'text',
      cell: '', readonly: true,
    }, {
      id: 'argval', label: gettext('Value'), type: 'text',
      cell: 'text',
    }];
  }
}
