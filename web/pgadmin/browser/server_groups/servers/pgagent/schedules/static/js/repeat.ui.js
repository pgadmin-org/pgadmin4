import gettext from 'sources/gettext';
import { BaseUISchema } from '../../../../../../../static/js/SchemaView';
import { WEEKDAYS, PGAGENT_MONTHDAYS, MONTHS, HOURS, MINUTES } from '../../../../../../static/js/constants';


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

export class TimesSchema extends BaseUISchema {
  constructor(initValues={}, schemaConfig={
    hours: {},
    minutes: {}
  }) {
    super({
      ...initValues,
    });
    this.schemaConfig = schemaConfig;
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
        options: HOURS, ...(this.schemaConfig.hours??{})
      }, {
        id: 'jscminutes', label: gettext('Minutes'), type: 'select',
        group: gettext('Times'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the minutes...'),
          formatter: BooleanArrayFormatter,
        },
        options: MINUTES, ...(this.schemaConfig.hours??{})
      }
    ];
  }
}

export class DaysSchema extends BaseUISchema {
  constructor(initValues={}, schemaConfig={
    weekdays: {}, monthdays: {}, months: {}
  }) {
    super({
      ...initValues,
    });

    this.schemaConfig = schemaConfig;
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
        options: WEEKDAYS, ...(this.schemaConfig.weekdays??{})
      }, {
        id: 'jscmonthdays', label: gettext('Month Days'), type: 'select',
        group: gettext('Days'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the month days...'),
          formatter: BooleanArrayFormatter,
        },
        options: PGAGENT_MONTHDAYS, ...(this.schemaConfig.monthdays??{})
      }, {
        id: 'jscmonths', label: gettext('Months'), type: 'select',
        group: gettext('Days'),
        controlProps: { allowClear: true, multiple: true, allowSelectAll: true,
          placeholder: gettext('Select the months...'),
          formatter: BooleanArrayFormatter,
        },
        options: MONTHS, ...(this.schemaConfig.months??{})
      }
    ];
  }
}
