/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.pga_schedule', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'moment', 'pgadmin.browser', 'alertify',
  'pgadmin.backform', 'pgadmin.backgrid',
], function(
  gettext, url_for, $, _, pgAdmin, moment, pgBrowser, Alertify, Backform,
  Backgrid
) {

  if (!pgBrowser.Nodes['coll-pga_schedule']) {
    pgBrowser.Nodes['coll-pga_schedule'] =
      pgBrowser.Collection.extend({
        node: 'pga_schedule',
        label: gettext('Schedules'),
        type: 'coll-pga_schedule',
        columns: ['jscid', 'jscname', 'jscenabled'],
        hasStatistics: false,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['pga_schedule']) {

    var weekdays = [
        gettext('Sunday'), gettext('Monday'), gettext('Tuesday'),
        gettext('Wednesday'), gettext('Thursday'), gettext('Friday'),
        gettext('Saturday'),
      ],
      monthdays = [
        gettext('1st'), gettext('2nd'), gettext('3rd'),
        gettext('4th'), gettext('5th'), gettext('6th'),
        gettext('7th'), gettext('8th'), gettext('9th'),
        gettext('10th'), gettext('11th'), gettext('12th'),
        gettext('13th'), gettext('14th'), gettext('15th'),
        gettext('16th'), gettext('17th'), gettext('18th'),
        gettext('19th'), gettext('20th'), gettext('21st'),
        gettext('22nd'), gettext('23rd'), gettext('24th'),
        gettext('25th'), gettext('26th'), gettext('27th'),
        gettext('28th'), gettext('29th'), gettext('30th'),
        gettext('31st'), gettext('Last day'),
      ],
      months = [
        gettext('January'), gettext('February'), gettext('March'),
        gettext('April'), gettext('May'), gettext('June'),
        gettext('July'), gettext('August'), gettext('September'),
        gettext('October'), gettext('November'), gettext('December'),
      ],
      hours = [
        gettext('00'), gettext('01'), gettext('02'), gettext('03'),
        gettext('04'), gettext('05'), gettext('06'), gettext('07'),
        gettext('08'), gettext('09'), gettext('10'), gettext('11'),
        gettext('12'), gettext('13'), gettext('14'), gettext('15'),
        gettext('16'), gettext('17'), gettext('18'), gettext('19'),
        gettext('20'), gettext('21'), gettext('22'), gettext('23'),
      ],
      minutes = [
        gettext('00'), gettext('01'), gettext('02'), gettext('03'),
        gettext('04'), gettext('05'), gettext('06'), gettext('07'),
        gettext('08'), gettext('09'), gettext('10'), gettext('11'),
        gettext('12'), gettext('13'), gettext('14'), gettext('15'),
        gettext('16'), gettext('17'), gettext('18'), gettext('19'),
        gettext('20'), gettext('21'), gettext('22'), gettext('23'),
        gettext('24'), gettext('25'), gettext('26'), gettext('27'),
        gettext('28'), gettext('29'), gettext('30'), gettext('31'),
        gettext('32'), gettext('33'), gettext('34'), gettext('35'),
        gettext('36'), gettext('37'), gettext('38'), gettext('39'),
        gettext('40'), gettext('41'), gettext('42'), gettext('43'),
        gettext('44'), gettext('45'), gettext('46'), gettext('47'),
        gettext('48'), gettext('49'), gettext('50'), gettext('51'),
        gettext('52'), gettext('53'), gettext('54'), gettext('55'),
        gettext('56'), gettext('57'), gettext('58'), gettext('59'),
      ],
      AnyDatetimeCell = Backgrid.Extension.MomentCell.extend({
        editor: Backgrid.Extension.DatetimePickerEditor,
        render: function() {
          this.$el.empty();
          var model = this.model;
          this.$el.text(this.formatter.fromRaw(model.get(this.column.get('name')), model) || gettext('<any>'));
          this.delegateEvents();

          return this;
        },
      }),
      DatetimeCell = Backgrid.Extension.MomentCell.extend({
        editor: Backgrid.Extension.DatetimePickerEditor,
      }),
      BooleanArrayFormatter = function(selector, indexes) {
        var self = this;

        self.selector = selector;
        self.indexes = indexes;

        this.fromRaw = function(rawData) {
          if (!_.isArray(rawData)) {
            return rawData;
          }

          var res = [], idx = 0, resIdx = [];

          for (; idx < rawData.length; idx++) {
            if (!rawData[idx])
              continue;
            res.push(self.selector[idx]);
            resIdx.push(idx + 1);
          }

          return self.indexes ? resIdx : res.join(', ');
        };
        this.toRaw = function(d) {
          if (!self.indexes)
            return d;
          var res = [], i = 0, l = self.selector.length;

          for (; i < l; i++) {
            res.push(_.indexOf(d, String(i + 1)) != -1);
          }
          return res;
        };

        return self;
      },
      BooleanArrayOptions = function(ctrl) {
        var selector = ctrl.field.get('selector'),
          val = ctrl.model.get(ctrl.field.get('name')),
          res = [];

        if (selector) {
          res = _.map(
            selector, function(v, i) {
              return {label: v, value: i + 1, selected: val[i]};
            }
          );
        }
        return res;
      },
      ExceptionModel = pgBrowser.Node.Model.extend({
        defaults: {
          jexid: undefined,
          jexdate: null,
          jextime: null,
        },
        idAttribute: 'jexid',
        schema: [{
          id: 'jexdate', type: 'text', label: gettext('Date'),
          editable: true, placeholder: gettext('<any>'),
          cell: AnyDatetimeCell, options: {format: 'YYYY-MM-DD'},
          displayFormat: 'YYYY-MM-DD', modelFormat: 'YYYY-MM-DD',
          cellHeaderClasses:'width_percent_50', allowEmpty: true,
        },{
          id: 'jextime', type: 'text', placeholder: gettext('<any>'),
          label: gettext('Time'), editable: true, cell: AnyDatetimeCell,
          options: {format: 'HH:mm', buttons: {
            showToday: false,
          }}, displayFormat: 'HH:mm',
          modelFormat: 'HH:mm:ss', displayInUTC: true, allowEmpty: true,
          cellHeaderClasses:'width_percent_50', modalInUTC: true,
        }],
        validate: function() {
          var self = this, exceptions = this.collection,
            errMsg, hasExceptionErr = false,
            d = (this.get('jexdate') || '<any>'),
            t = this.get('jextime') || '<any>',
            id = this.get('jexid') || this.cid;

          self.errorModel.unset('jscdate');
          if (d == t && d == '<any>') {
            errMsg = gettext('Please specify date/time.');
            self.errorModel.set('jscdate', errMsg);
            return errMsg ;
          }

          exceptions.each(function(ex) {
            if (hasExceptionErr || id == (ex.get('jexid') || ex.cid))
              return;

            if (
              d == (ex.get('jexdate') || '<any>') &&
                t == (ex.get('jextime') || '<any>')
            ) {
              errMsg = gettext('Please specify unique set of exceptions.');
              if (ex.errorModel.get('jscdate') != errMsg)
                self.errorModel.set('jscdate', errMsg);
              hasExceptionErr = true;
            }
          });

          return errMsg;
        },
      });

    var CustomInfoControl = Backform.Control.extend({
      template: _.template([
        '<div>',
        '  <%=infotext%>',
        '</div>',
      ].join('\n')),
      className: 'pgadmin-control-group',
    });

    pgBrowser.Nodes['pga_schedule'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_schedule',
      dialogHelp: url_for('help.static', {'filename': 'pgagent_jobs.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: false,
      canDrop: true,
      label: gettext('Schedule'),
      node_image: 'icon-pga_schedule',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_schedule_on_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'},
        },{
          name: 'create_pga_schedule_on_coll', node: 'coll-pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'},
        },{
          name: 'create_pga_schedule', node: 'pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Schedule...'),
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'},
        }]);
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
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
        },
        idAttribute: 'jscid',
        parse: function(d) {
          d.jscexceptions = [];
          if (d.jexid && d.jexid.length) {
            var idx = 0;
            for (; idx < d.jexid.length; idx++) {
              d.jscexceptions.push({
                'jexid': d.jexid[idx],
                'jexdate': d.jexdate[idx],
                'jextime': d.jextime[idx],
              });
            }
          }
          delete d.jexid;
          delete d.jexdate;
          delete d.jextime;

          return pgBrowser.Node.Model.prototype.parse.apply(this, arguments);
        },
        schema: [{
          id: 'jscid', label: gettext('ID'), type: 'int',
          cellHeaderClasses: 'width_percent_5', mode: ['properties'],
        },{
          id: 'jscname', label: gettext('Name'), type: 'text',
          cellHeaderClasses: 'width_percent_45',
          disabled: function() { return false; },
        },{
          id: 'jscenabled', label: gettext('Enabled?'), type: 'switch',
          disabled: function() { return false; },
          cellHeaderClasses: 'width_percent_5',
        },{
          id: 'jscstart', label: gettext('Start'), type: 'text',
          control: 'datetimepicker', cell: DatetimeCell,
          disabled: function() { return false; }, displayInUTC: false,
          displayFormat: 'YYYY-MM-DD HH:mm:ss Z',
          modelFormat: 'YYYY-MM-DD HH:mm:ss Z', options: {
            format: 'YYYY-MM-DD HH:mm:ss Z',
            minDate: moment().add(0, 'm'),
          }, cellHeaderClasses: 'width_percent_25',
        },{
          id: 'jscend', label: gettext('End'), type: 'text',
          control: 'datetimepicker', cell: DatetimeCell,
          disabled: function() { return false; }, displayInUTC: false,
          displayFormat: 'YYYY-MM-DD HH:mm:ss Z', options: {
            format: 'YYYY-MM-DD HH:mm:ss Z',
            minDate: moment().add(0, 'm'),
          }, cellHeaderClasses: 'width_percent_25',
          modelFormat: 'YYYY-MM-DD HH:mm:ss Z',
        },{
          id: 'jscweekdays', label: gettext('Week days'), type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(weekdays, false),
          }), mode: ['properties'],
        },{
          id: 'jscmonthdays', label: gettext('Month days'), type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(monthdays, false),
          }), mode: ['properties'],
        },{
          id: 'jscmonths', label: gettext('Months'), type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(months, false),
          }), mode: ['properties'],
        },{
          id: 'jschours', label: gettext('Hours'), type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(hours, false),
          }), mode: ['properties'],
        },{
          id: 'jscminutes', label: gettext('Minutes'), type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(minutes, false),
          }), mode: ['properties'],
        },{
          id: 'jscexceptions', label: gettext('Exceptions'), type: 'text',
          control: Backform.Control.extend({
            formatter: new function() {
              this.fromRaw = function(rawData) {
                var res = '', idx = 0, d;

                if (!rawData) {
                  return res;
                }

                for (; idx < rawData.length; idx++) {
                  d = rawData[idx];
                  if (idx)
                    res += ', ';
                  res += '[' + String((d.jexdate || '') + ' ' + (d.jextime || '')).replace(/^\s+|\s+$/g, '') + ']';
                }

                return res;
              };
              this.toRaw = function(data) { return data; };

              return this;
            },
          }), mode: ['properties'],
        },{
          type: 'control',  mode: ['create', 'edit'], group: gettext('Repeat'),
          infotext: gettext('Schedules are specified using a <strong>cron-style</strong> format.<br/><ul><li>For each selected time or date element, the schedule will execute.<br/>e.g. To execute at 5 minutes past every hour, simply select ‘05’ in the Minutes list box.<br/></li><li>Values from more than one field may be specified in order to further control the schedule.<br/>e.g. To execute at 12:05 and 14:05 every Monday and Thursday, you would click minute 05, hours 12 and 14, and weekdays Monday and Thursday.</li><li>For additional flexibility, the Month Days check list includes an extra Last Day option. This matches the last day of the month, whether it happens to be the 28th, 29th, 30th or 31st.</li></ul>'),
          control: CustomInfoControl,
        },{
          type: 'nested', label: gettext('Days'), group: gettext('Repeat'),
          mode: ['create', 'edit'],
          control: Backform.FieldsetControl.extend({
            render: function() {
              var res = Backform.FieldsetControl.prototype.render.apply(
                this, arguments
              );
              return res;
            },
          }),
          schema:[{
            id: 'jscweekdays', label: gettext('Week Days'), cell: 'select2',
            group: gettext('Days'), control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: gettext('Select the weekdays...'),
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              ),
            },
            formatter: new BooleanArrayFormatter(weekdays, true),
            selector: weekdays, options: BooleanArrayOptions,
          },{
            id: 'jscmonthdays', label: gettext('Month Days'), cell: 'select2',
            group: gettext('Days'), control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: gettext('Select the month days...'),
              width: 'style',
              showOnScroll: false,
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              ),
            },
            formatter: new BooleanArrayFormatter(monthdays, true),
            selector: monthdays, options: BooleanArrayOptions,
          },{
            id: 'jscmonths', label: gettext('Months'), cell: 'select2',
            group: gettext('Days'), control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: gettext('Select the months...'),
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              ),
            },
            formatter: new BooleanArrayFormatter(months, true),
            selector: months, options: BooleanArrayOptions,
          }],
        },{
          type: 'nested', control: 'fieldset', label: gettext('Times'),
          group: gettext('Repeat'), mode: ['create', 'edit'],
          schema:[{
            id: 'jschours', label: gettext('Hours'), cell: 'select2',
            group: gettext('Times'), control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: gettext('Select the hours...'),
              width: 'style',
              showOnScroll: false,
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              ),
            },
            formatter: new BooleanArrayFormatter(hours, true),
            selector: hours, options: BooleanArrayOptions,
          },{
            id: 'jscminutes', label: gettext('Minutes'), cell: 'select2',
            group: gettext('Times'), control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: gettext('Select the minutes...'),
              width: 'style',
              showOnScroll: false,
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              ),
            },
            formatter: new BooleanArrayFormatter(minutes, true),
            selector: minutes, options: BooleanArrayOptions,
          }],
        },{
          id: 'jscexceptions', type: 'collection', mode: ['edit', 'create'],
          label: '', canEdit: false, model: ExceptionModel, canAdd: true,
          group: gettext('Exceptions'), canDelete: true,
          cols: ['jexdate', 'jextime'], control: 'sub-node-collection',
        },{
          id: 'jscdesc', label: gettext('Comment'), type: 'multiline',
        }],
        validate: function() {
          var val = this.get('jscname'),
            errMsg = null, msg;

          if (_.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('jscname', msg);
            errMsg = msg;
          } else {
            this.errorModel.unset('jscname');
          }

          val = this.get('jscstart');
          if (_.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Please enter the start time.');
            if (val == '') {
              this.set('jscstart', undefined);
            }
            this.errorModel.set('jscstart', msg);
            errMsg = errMsg || msg;
          } else {
            this.errorModel.unset('jscstart');
          }

          // End time must be greater than Start time
          if(!errMsg) {
            val = this.get('jscend');
            // No further validation required if end date is not provided by
            // the user
            if (_.isUndefined(val) || _.isNull(val) ||
              String(val).replace(/^\s+|\s+$/g, '') == '') {
              if (val == '') {
                /* Set the default value used in model initialization */
                this.set('jscend', null);
              }
              return;
            }

            var start_time = this.get('jscstart'),
              end_time = this.get('jscend'),
              start_time_js =  start_time.split(' '),
              end_time_js =  end_time.split(' ');

            start_time_js = moment(start_time_js[0] + ' ' + start_time_js[1]);
            end_time_js = moment(end_time_js[0] + ' ' + end_time_js[1]);

            if(end_time_js.isBefore(start_time_js)) {
              errMsg = gettext('Start time must be less than end time');
              this.errorModel.set('jscstart', errMsg);
            }
          }

          return errMsg;
        },
      }),
    });
  }

  return pgBrowser.Nodes['pga_schedule'];
});
