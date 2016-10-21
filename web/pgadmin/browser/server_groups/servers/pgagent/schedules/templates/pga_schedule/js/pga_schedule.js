define([
        'jquery', 'underscore', 'underscore.string', 'pgadmin', 'moment',
        'pgadmin.browser', 'alertify', 'backform', 'pgadmin.backform'
        ],
function($, _, S, pgAdmin, moment, pgBrowser, Alertify, Backform) {

  if (!pgBrowser.Nodes['coll-pga_schedule']) {
    pgBrowser.Nodes['coll-pga_schedule'] =
      pgBrowser.Collection.extend({
        node: 'pga_schedule',
        label: '{{ _('Schedules') }}',
        type: 'coll-pga_schedule',
        columns: ['jscid', 'jscname', 'jscenabled'],
        hasStatistics: false
      });
  }

  if (!pgBrowser.Nodes['pga_schedule']) {

    var weekdays = [
          '{{ _("Sunday") }}', '{{ _("Monday") }}', '{{ _("Tuesday") }}',
          '{{ _("Wednesday") }}', '{{ _("Thursday") }}', '{{ _("Friday") }}',
          '{{ _("Saturday") }}'
        ],
        monthdays = [
          '{{ _("1st") }}', '{{ _("2nd") }}', '{{ _("3rd") }}',
          '{{ _("4th") }}', '{{ _("5th") }}', '{{ _("6th") }}',
          '{{ _("7th") }}', '{{ _("8th") }}', '{{ _("9th") }}',
          '{{ _("10th") }}', '{{ _("11th") }}', '{{ _("12th") }}',
          '{{ _("13th") }}', '{{ _("14th") }}', '{{ _("15th") }}',
          '{{ _("16th") }}', '{{ _("17th") }}', '{{ _("18th") }}',
          '{{ _("19th") }}', '{{ _("20th") }}', '{{ _("21st") }}',
          '{{ _("22nd") }}', '{{ _("23rd") }}', '{{ _("24th") }}',
          '{{ _("25th") }}', '{{ _("26th") }}', '{{ _("27th") }}',
          '{{ _("28th") }}', '{{ _("29th") }}', '{{ _("30th") }}',
          '{{ _("31st") }}', '{{ _("Last day") }}'
        ],
        months = [
          '{{ _("January") }}', '{{ _("February") }}', '{{ _("March") }}',
          '{{ _("April") }}', '{{ _("May") }}', '{{ _("June") }}',
          '{{ _("July") }}', '{{ _("August") }}', '{{ _("September") }}',
          '{{ _("October") }}', '{{ _("November") }}', '{{ _("December") }}'
        ],
        hours = [
          '{{ _("00") }}', '{{ _("01") }}', '{{ _("02") }}', '{{ _("03") }}',
          '{{ _("04") }}', '{{ _("05") }}', '{{ _("06") }}', '{{ _("07") }}',
          '{{ _("08") }}', '{{ _("09") }}', '{{ _("10") }}', '{{ _("11") }}',
          '{{ _("12") }}', '{{ _("13") }}', '{{ _("14") }}', '{{ _("15") }}',
          '{{ _("16") }}', '{{ _("17") }}', '{{ _("18") }}', '{{ _("19") }}',
          '{{ _("20") }}', '{{ _("21") }}', '{{ _("22") }}', '{{ _("23") }}'
        ],
        minutes = [
          '{{ _("00") }}', '{{ _("01") }}', '{{ _("02") }}', '{{ _("03") }}',
          '{{ _("04") }}', '{{ _("05") }}', '{{ _("06") }}', '{{ _("07") }}',
          '{{ _("08") }}', '{{ _("09") }}', '{{ _("10") }}', '{{ _("11") }}',
          '{{ _("12") }}', '{{ _("13") }}', '{{ _("14") }}', '{{ _("15") }}',
          '{{ _("16") }}', '{{ _("17") }}', '{{ _("18") }}', '{{ _("19") }}',
          '{{ _("20") }}', '{{ _("21") }}', '{{ _("22") }}', '{{ _("23") }}',
          '{{ _("24") }}', '{{ _("25") }}', '{{ _("26") }}', '{{ _("27") }}',
          '{{ _("28") }}', '{{ _("29") }}', '{{ _("30") }}', '{{ _("31") }}',
          '{{ _("32") }}', '{{ _("33") }}', '{{ _("34") }}', '{{ _("35") }}',
          '{{ _("36") }}', '{{ _("37") }}', '{{ _("38") }}', '{{ _("39") }}',
          '{{ _("40") }}', '{{ _("41") }}', '{{ _("42") }}', '{{ _("43") }}',
          '{{ _("44") }}', '{{ _("45") }}', '{{ _("46") }}', '{{ _("47") }}',
          '{{ _("48") }}', '{{ _("49") }}', '{{ _("50") }}', '{{ _("51") }}',
          '{{ _("52") }}', '{{ _("53") }}', '{{ _("54") }}', '{{ _("55") }}',
          '{{ _("56") }}', '{{ _("57") }}', '{{ _("58") }}', '{{ _("59") }}'
        ],
        AnyDatetimeCell = Backgrid.Extension.MomentCell.extend({
          editor: Backgrid.Extension.DatetimePickerEditor,
          render: function() {
            this.$el.empty();
            var model = this.model;
            this.$el.text(this.formatter.fromRaw(model.get(this.column.get("name")), model) || '{{ _('<Any>') }}');
            this.delegateEvents();

            return this;
          }
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
          }
          this.toRaw = function(d) {
            if (!self.indexes)
              return d;
            var res = [], i = 0, l = self.selector.length;

            for (; i < l; i++) {
              res.push(_.indexOf(d, String(i + 1)) != -1);
            }
            console.log(res);
            return res;
          }

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
            jextime: null
          },
          idAttribute: 'jexid',
          schema: [{
            id: 'jexdate', type: 'text', label: '{{ _('Date') }}',
            editable: true, placeholder: '{{ _('<any>') }}',
            cell: AnyDatetimeCell, options: {format: 'YYYY-MM-DD'},
            displayFormat: 'YYYY-MM-DD', modelFormat: 'YYYY-MM-DD',
            cellHeaderClasses:'width_percent_50', allowEmpty: true
          },{
            id: 'jextime', type: 'text', placeholder: '{{ _('<any>') }}',
            label: '{{ _('Time') }}', editable: true, cell: AnyDatetimeCell,
            options: {format: 'HH:mm'}, displayFormat: 'HH:mm',
            modelFormat: 'HH:mm:ss', displayInUTC: false, allowEmpty: true,
            cellHeaderClasses:'width_percent_50', modalInUTC: false
          }],
          validate: function() {
            var self = this, exceptions = this.collection,
                dates = {}, errMsg, hasExceptionErr = false,
                d = (this.get('jexdate') || '<any>'),
                t = this.get('jextime') || '<any>',
                id = this.get('jexid') || this.cid;

            self.errorModel.unset('jscdate');
            if (d == t && d == '<any>') {
              errMsg = '{{ _('Please specify date/time.') }}';
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
                errMsg = '{{ _('Please specify unique set of exceptions.') }}';
                if (ex.errorModel.get('jscdate') != errMsg)
                    self.errorModel.set('jscdate', errMsg);
                hasExceptionErr = true;
              }
            });

            return errMsg;
          }
        });

    pgBrowser.Nodes['pga_schedule'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_schedule',
      dialogHelp: '{{ url_for('help.static', filename='pgagent_jobs.html') }}',
      hasSQL: true,
      hasDepends: false,
      hasStatistics: false,
      canDrop: function(node) {
        return true;
      },
      label: '{{ _('Schedule') }}',
      node_image: 'icon-pga_schedule',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_schedule_on_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schedule...') }}',
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'}
        },{
          name: 'create_pga_schedule_on_coll', node: 'coll-pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schedule...') }}',
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'}
        },{
          name: 'create_pga_schedule', node: 'pga_schedule', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Schedule...') }}',
          icon: 'wcTabIcon icon-pga_schedule', data: {action: 'create'}
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
          jscexceptions: []
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
                'jextime': d.jextime[idx]
              });
            }
          }
          delete d.jexid;
          delete d.jexdate;
          delete d.jextime;

          return pgBrowser.Node.Model.prototype.parse.apply(this, arguments);
        },
        schema: [{
          id: 'jscid', label: '{{ _('ID') }}', type: 'integer',
          cellHeaderClasses: 'width_percent_5', mode: ['properties']
        },{
          id: 'jscname', label: '{{ _('Name') }}', type: 'text',
          cellHeaderClasses: 'width_percent_45',
          disabled: function() { return false; }
        },{
          id: 'jscenabled', label: '{{ _('Enabled?') }}', type: 'switch',
          disabled: function() { return false; },
          cellHeaderClasses: 'width_percent_5'
        },{
          id: 'jscstart', label: '{{ _('Start') }}', type: 'text',
          control: 'datetimepicker', cell: 'moment',
          disabled: function() { return false; },
          displayFormat: 'YYYY-MM-DD HH:mm:ss Z',
          modelFormat: 'YYYY-MM-DD HH:mm:ss Z', options: {
            format: 'YYYY-MM-DD HH:mm:ss Z',
          }, cellHeaderClasses: 'width_percent_25'
        },{
          id: 'jscend', label: '{{ _('End') }}', type: 'text',
          control: 'datetimepicker', cell: 'moment',
          disabled: function() { return false; }, displayInUTC: false,
          displayFormat: 'YYYY-MM-DD HH:mm:ss Z', options: {
            format: 'YYYY-MM-DD HH:mm:ss Z', useCurrent: false
          }, cellHeaderClasses: 'width_percent_25',
          modelFormat: 'YYYY-MM-DD HH:mm:ss Z'
        },{
          id: 'jscweekdays', label:'{{ _('Week days') }}', type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(weekdays, false)
          }), mode: ['properties']
        },{
          id: 'jscmonthdays', label:'{{ _('Month days') }}', type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(monthdays, false)
          }), mode: ['properties']
        },{
          id: 'jscmonths', label:'{{ _('Months') }}', type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(months, false)
          }), mode: ['properties']
        },{
          id: 'jschours', label:'{{ _('Hours') }}', type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(hours, false)
          }), mode: ['properties']
        },{
          id: 'jscminutes', label:'{{ _('Minutes') }}', type: 'text',
          control: Backform.Control.extend({
            formatter: new BooleanArrayFormatter(minutes, false)
          }), mode: ['properties']
        },{
          id: 'jscexceptions', label:'{{ _('Exceptions') }}', type: 'text',
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
              }
              this.toRaw = function(data) { return data; }

              return this;
            }
          }), mode: ['properties']
        },{
          type: 'nested', label: '{{ _('Days') }}', group: '{{ _('Repeat') }}',
          mode: ['create', 'edit'],
          control: Backform.FieldsetControl.extend({
            render: function() {
              var res = Backform.FieldsetControl.prototype.render.apply(
                this, arguments
              );

              this.$el.prepend(
                '<div class="' + Backform.helpMessageClassName + ' set-group pg-el-xs-12">{{ _("Schedules are specified using a <b>cron-style</b> format.<br/><ul><li>For each selected time or date element, the schedule will execute.<br/>e.g. To execute at 5 minutes past every hour, simply select ‘05’ in the Minutes list box.<br/></li><li>Values from more than one field may be specified in order to further control the schedule.<br/>e.g. To execute at 12:05 and 14:05 every Monday and Thursday, you would click minute 05, hours 12 and 14, and weekdays Monday and Thursday.</li><li>For additional flexibility, the Month Days check list includes an extra Last Day option. This matches the last day of the month, whether it happens to be the 28th, 29th, 30th or 31st.</li></ul>") }}</div>'
              );

              return res;
            }
          }),
          schema:[{
            id: 'jscweekdays', label:'{{ _('Week Days') }}', cell: 'select2',
            group: '{{ _('Days') }}', control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: '{{ _("Select the weekdays...") }}',
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              )
            },
            selector: weekdays,
            formatter: new BooleanArrayFormatter(weekdays, true),
            options: BooleanArrayOptions
          },{
            id: 'jscmonthdays', label:'{{ _('Month Days') }}', cell: 'select2',
            group: '{{ _('Days') }}', control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: '{{ _("Select the month days...") }}',
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              )
            },
            formatter: new BooleanArrayFormatter(monthdays, true),
            selector: monthdays, options: BooleanArrayOptions
          },{
            id: 'jscmonths', label:'{{ _('Months') }}', cell: 'select2',
            group: '{{ _('Days') }}', control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: '{{ _("Select the months...") }}',
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              )
            },
            formatter: new BooleanArrayFormatter(months, true),
            selector: months, options: BooleanArrayOptions
          }]
        },{
          type: 'nested', control: 'fieldset', label: '{{ _('Times') }}',
          group: '{{ _('Repeat') }}', mode: ['create', 'edit'],
          schema:[{
            id: 'jschours', label:'{{ _('Hours') }}', cell: 'select2',
            group: '{{ _('Times') }}', control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: '{{ _("Select the hours...") }}',
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              )
            },
            formatter: new BooleanArrayFormatter(hours, true),
            selector: hours, options: BooleanArrayOptions
          },{
            id: 'jscminutes', label:'{{ _('Minutes') }}', cell: 'select2',
            group: '{{ _('Times') }}', control: 'select2', type: 'array',
            select2: {
              first_empty: false,
              multiple: true,
              allowClear: true,
              placeholder: '{{ _("Select the minutes...") }}',
              width: 'style',
              dropdownAdapter: $.fn.select2.amd.require(
                'select2/selectAllAdapter'
              )
            },
            formatter: new BooleanArrayFormatter(minutes, true),
            selector: minutes, options: BooleanArrayOptions
          }]
        },{
          id: 'jscexceptions', type: 'collection', mode: ['edit', 'create'],
          label: "", canEdit: false, model: ExceptionModel, canAdd: true,
          group: '{{ _('Exceptions') }}', canDelete: true,
          cols: ['jexdate', 'jextime'], control: 'sub-node-collection'
        },{
          id: 'jscdesc', label: '{{ _('Comment') }}', type: 'multiline'
        }],
        validate: function(keys) {
          var val = this.get('jscname'),
              errMsg = null;

          if (_.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('jscname', msg);
            errMsg = msg;
          } else {
            this.errorModel.unset('jscname');
          }

          val = this.get('jscstart');
          if (_.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Please enter the start time.') }}';
            this.errorModel.set('jscstart', msg);
            errMsg = errMsg || msg;
          } else {
            this.errorModel.unset('jscstart');
          }

          val = this.get('jscend');
          if (_.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Please enter the end time.') }}';
            this.errorModel.set('jscend', msg);
            errMsg = errMsg || msg;
          } else {
            this.errorModel.unset('jscend');
          }

          return errMsg;
        }
      })
    });
  }

  return pgBrowser.Nodes['pga_schedule'];
});
