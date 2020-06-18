/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.pga_jobstep', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'alertify', 'backform',
  'backgrid', 'pgadmin.backform', 'pgadmin.backgrid',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Alertify, Backform, Backgrid) {

  if (!pgBrowser.Nodes['coll-pga_jobstep']) {
    pgBrowser.Nodes['coll-pga_jobstep'] =
      pgBrowser.Collection.extend({
        node: 'pga_jobstep',
        label: gettext('Steps'),
        type: 'coll-pga_jobstep',
        columns: [
          'jstid', 'jstname', 'jstenabled', 'jstkind', 'jstconntype',
          'jstonerror',
        ],
        hasStatistics: false,
        canDropCascade: false,
      });
  }

  // Switch Cell with Deps, Needed for SubNode control
  var SwitchDepsCell = Backgrid.Extension.SwitchCell.extend({
    initialize: function initialize() {
      Backgrid.Extension.SwitchCell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },
    dependentChanged: function dependentChanged() {
      var model = this.model,
        column = this.column,
        editable = this.column.get('editable'),
        input = this.$el.find('input[type=checkbox]').first(),
        self_name = column.get('name'),
        is_editable;

      is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
      if (is_editable) {
        this.$el.addClass('editable');
        input.bootstrapToggle('disabled', false);
      } else {
        this.$el.removeClass('editable');
        input.bootstrapToggle('disabled', true);
        // Set self value into model
        setTimeout(function () {
          model.set(self_name, true);
        }, 10);

      }

      this.delegateEvents();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });

  if (!pgBrowser.Nodes['pga_jobstep']) {
    pgBrowser.Nodes['pga_jobstep'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_jobstep',
      dialogHelp: url_for('help.static', {'filename': 'pgagent_jobs.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '70%',
      height: '80%',
      canDrop: true,
      label: gettext('Step'),
      node_image: function() {
        return 'icon-pga_jobstep';
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_jobstep_on_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep',
        },{
          name: 'create_pga_jobstep_on_coll', node: 'coll-pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep',
        },{
          name: 'create_pga_jobstep', node: 'pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep',
        }]);
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
          jstid: null,
          jstjobid: null,
          jstname: '',
          jstdesc: '',
          jstenabled: true,
          jstkind: true,
          jstconntype: true,
          jstcode: '',
          jstconnstr: null,
          jstdbname: null,
          jstonerror: 'f',
          jstnextrun: '',
        },
        initialize: function() {
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
          if (this.isNew() && this.get('jstconntype')) {
            var args = arguments.length > 1 && arguments[1];

            if (args) {
              if (!_.isUndefined(args['node_info']) ||
                  !_.isUndefined(args.collection.top['node_info'])) {
                this.set(
                  'jstdbname',
                  (args['node_info'] || args.collection.top['node_info'])['server']['db']
                );
              }
            }
          }
        },
        idAttribute: 'jstid',
        schema: [{
          id: 'jstid', label: gettext('ID'), type: 'int',
          cellHeaderClasses: 'width_percent_5', mode: ['properties'],
        },{
          id: 'jstname', label: gettext('Name'), type: 'text',
          disabled: false, cellHeaderClasses: 'width_percent_60',
        },{
          id: 'jstenabled', label: gettext('Enabled?'),
          type: 'switch',
          disabled: function() { return false; },
        },{
          id: 'jstkind', label: gettext('Kind'), type: 'switch',
          options: {
            'onText': gettext('SQL'), 'offText': gettext('Batch'),
            'onColor': 'primary', 'offColor': 'primary',
          }, control: Backform.SwitchControl,
          disabled: function() { return false; },
        },{
          id: 'jstconntype', label: gettext('Connection type'),
          type: 'switch', deps: ['jstkind'], mode: ['properties'],
          disabled: function(m) { return !m.get('jstkind'); },
          options: {
            'onText': gettext('Local'), 'offText': gettext('Remote'),
            'onColor': 'primary', 'offColor': 'primary', width: '65',
          },
        },{
          id: 'jstconntype', label: gettext('Connection type'),
          type: 'switch', deps: ['jstkind'], mode: ['create', 'edit'],
          disabled: function(m) { return !m.get('jstkind'); },
          cell: SwitchDepsCell,
          editable: function(m) {
            // If jstkind is Batch then disable it
            return m.get('jstkind');
          },
          options: {
            'onText': gettext('Local'), 'offText': gettext('Remote'),
            'onColor': 'primary', 'offColor': 'primary', width: '65',
          }, helpMessage: gettext('Select <strong>Local</strong> if the job step will execute on the local database server, or <strong>Remote</strong> to specify a remote database server.'),
        },{
          id: 'jstdbname', label: gettext('Database'), type: 'text',
          mode: ['properties'], disabled: function() { return false; },
        },{
          id: 'jstconnstr', type: 'text', mode: ['properties'],
          label: gettext('Connection string'),
        },{
          id: 'jstdbname', label: gettext('Database'), type: 'text',
          control: 'node-list-by-name', node: 'database',
          cache_node: 'database', select2: {allowClear: true, placeholder: ''},
          disabled: function(m) {
            return !m.get('jstkind') || !m.get('jstconntype');
          }, deps: ['jstkind', 'jstconntype'], mode: ['create', 'edit'],
          helpMessage: gettext('Please select the database on which the job step will run.'),
        },{
          id: 'jstconnstr', label: gettext('Connection string'), type: 'text',
          deps: ['jstkind', 'jstconntype'], disabled: function(m) {
            return !m.get('jstkind') || m.get('jstconntype');
          }, helpMessage: gettext('Please specify the connection string for the remote database server. Each parameter setting is in the form keyword = value. Spaces around the equal sign are optional. To write an empty value, or a value containing spaces, surround it with single quotes, e.g., keyword = \'a value\'. Single quotes and backslashes within the value must be escaped with a backslash, i.e., \' and \\.<br>For more information, please see the documentation on <a href="https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING" target="_blank">libpq connection strings</a>.'
          ), mode: ['create', 'edit'],
        },{
          id: 'jstonerror', label: gettext('On error'), cell: 'select2',
          control: 'select2', options: [
            {'label': gettext('Fail'), 'value': 'f'},
            {'label': gettext('Success'), 'value': 's'},
            {'label': gettext('Ignore'), 'value': 'i'},
          ], select2: {allowClear: false}, disabled: function() {
            return false;
          },
        },{
          id: 'jstdesc', label: gettext('Comment'), type: 'multiline',
        },{
          id: 'jstcode', label: '', cell: 'string', deps: ['jstkind'],
          type: 'text', group: gettext('Code'),
          tabPanelCodeClass: 'sql-code-control',
          control: Backform.SqlCodeControl,
        }],
        validate: function() {
          var val = this.get('jstname'),
            errMsg = null, msg;

          if (
            _.isUndefined(val) || _.isNull(val) ||
              String(val).replace(/^\s+|\s+$/g, '') == ''
          ) {
            errMsg = gettext('Name cannot be empty.');
            this.errorModel.set('jstname', errMsg);
          } else {
            this.errorModel.unset('jstname');
          }
          if (this.get('jstkind')) {
            if (this.get('jstconntype')) {
              this.errorModel.unset('jstconnstr');
              val = this.get('jstdbname');
              if (
                _.isUndefined(val) || _.isNull(val) ||
                  String(val).replace(/^\s+|\s+$/g, '') == ''
              ) {
                msg = gettext('Please select a database.');
                errMsg = errMsg || msg;
                this.errorModel.set('jstdbname', msg);
              } else {
                this.errorModel.unset('jstdbname');
              }
            } else {
              this.errorModel.unset('jstdbname');
              var r = /\s*\b(\w+)\s*=\s*('([^'\\]*(?:\\.[^'\\]*)*)'|[\w|\.]*)/g;
              val = this.get('jstconnstr');
              if (
                _.isUndefined(val) || _.isNull(val) ||
                  String(val).replace(/^\s+|\s+$/g, '') == ''
              ) {
                msg = gettext('Please enter a connection string.');
              } else if (String(val).replace(r, '') != '') {
                msg = gettext('Please enter a valid connection string.');
              } else {
                var m,
                  params = {
                    'host': true, 'hostaddr': true, 'port': true,
                    'dbname': true, 'user': true, 'password': true,
                    'connect_timeout': true, 'client_encoding': true,
                    'application_name': true, 'options': true,
                    'fallback_application_name': true, 'sslmode': true,
                    'sslcert': true, 'sslkey': true, 'sslrootcert': true,
                    'sslcrl': true, 'keepalives': true, 'service': true,
                    'keepalives_idle': true, 'keepalives_interval': true,
                    'keepalives_count': true, 'sslcompression': true,
                    'requirepeer': true, 'krbsrvname': true, 'gsslib': true,
                  };

                while((m = r.exec(val))) {
                  if (params[m[1]]) {
                    if (m[2])
                      continue;
                    msg = gettext('Please enter a valid connection string.');
                    break;
                  }

                  msg = gettext('Invalid parameter in the connection string - %s.', m[1]);
                  break;
                }
              }

              if (msg) {
                errMsg = errMsg || msg;
                this.errorModel.set('jstconnstr', msg);
              } else {
                this.errorModel.unset('jstconnstr');
              }
            }
          } else {
            this.errorModel.unset('jstconnstr');
            this.errorModel.unset('jstdbname');
          }

          val = this.get('jstcode');
          if (
            _.isUndefined(val) || _.isNull(val) ||
              String(val).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Please specify code to execute.');
            errMsg = errMsg || msg;
            this.errorModel.set('jstcode', msg);
          } else {
            this.errorModel.unset('jstcode');
          }

          val = this.get('jstonerror');
          if (
            !_.isUndefined(val) && !_.isNull(val) &&
              String(val).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Please select valid on error option.');
            this.errorModel.set('jstonerror', msg);
          } else {
            this.errorModel.unset('jstonerror');
          }

          return errMsg;
        },
      }),
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
