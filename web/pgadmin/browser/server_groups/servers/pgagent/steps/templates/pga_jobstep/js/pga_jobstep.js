define([
        'jquery', 'underscore', 'underscore.string', 'pgadmin',
        'pgadmin.browser', 'alertify', 'backform', 'pgadmin.backform'
        ],
function($, _, S, pgAdmin, pgBrowser, Alertify, Backform) {

  if (!pgBrowser.Nodes['coll-pga_jobstep']) {
    pgBrowser.Nodes['coll-pga_jobstep'] =
      pgBrowser.Collection.extend({
        node: 'pga_jobstep',
        label: '{{ _('Steps') }}',
        type: 'coll-pga_jobstep',
        columns: [
          'jstid', 'jstname', 'jstenabled', 'jstkind', 'jstconntype',
          'jstonerror'
        ],
        hasStatistics: false
      });
  }

  if (!pgBrowser.Nodes['pga_jobstep']) {
    pgBrowser.Nodes['pga_jobstep'] = pgBrowser.Node.extend({
      parent_type: 'pga_job',
      type: 'pga_jobstep',
      dialogHelp: '{{ url_for('help.static', filename='pgagent_jobs.html') }}',
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '70%',
      height: '80%',
      canDrop: function(node) {
        return true;
      },
      label: '{{ _('Steps') }}',
      node_image: function() {
        console.log(arguments);
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
          category: 'create', priority: 4, label: '{{ _('Job Step...') }}',
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep'
        },{
          name: 'create_pga_jobstep_on_coll', node: 'coll-pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Job Step...') }}',
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep'
        },{
          name: 'create_pga_jobstep', node: 'pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Job Step...') }}',
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep'
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
          jstnextrun: ''
        },
        initialize: function() {
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
          if (this.isNew() && this.get('jstconntype')) {
            var args = arguments && arguments.length > 1 && arguments[1];

            if (args) {
              this.set(
                'jstdbname',
                (args['node_info'] || args.collection.top['node_info'])['server']['db']
              );
            }
          }
        },
        idAttribute: 'jstid',
        schema: [{
          id: 'jstid', label: '{{ _('ID') }}', type: 'integer',
          cellHeaderClasses: 'width_percent_5', mode: ['properties']
        },{
          id: 'jstname', label: '{{ _('Name') }}', type: 'text',
          disabled: function(m) { return false; },
          cellHeaderClasses: 'width_percent_60'
        },{
          id: 'jstenabled', label: '{{ _('Enabled?') }}', type: 'switch',
          disabled: function(m) { return false; }
        },{
          id: 'jstkind', label: '{{ _('Kind') }}', type: 'switch',
          options: {
            'onText': '{{ _('SQL') }}', 'offText': '{{ _('Batch') }}',
            'onColor': 'primary', 'offColor': 'primary'
          }, control: Backform.SwitchControl,
          disabled: function(m) { return false; }
        },{
          id: 'jstconntype', label: '{{ _('Connection type') }}',
          type: 'switch', deps: ['jstkind'], mode: ['properties'],
          disabled: function(m) { return !m.get('jstkind'); },
          options: {
            'onText': '{{ _('Local') }}', 'offText': '{{ _('Remote') }}',
            'onColor': 'primary', 'offColor': 'primary'
          }
        },{
          id: 'jstconntype', label: '{{ _('Connection type') }}',
          type: 'switch', deps: ['jstkind'], mode: ['create', 'edit'],
          disabled: function(m) { return !m.get('jstkind'); },
          options: {
            'onText': '{{ _('Local') }}', 'offText': '{{ _('Remote') }}',
            'onColor': 'primary', 'offColor': 'primary'
          }, helpMessage: '{{ _('Select <b>Local</b> if the job step will execute on the local database server, or <b>Remote</b> to specify a remote database server.') }}'
        },{
          id: 'jstdbname', label: '{{ _('Database') }}', type: 'text',
          mode: ['properties'], disabled: function(m) { return false; }
        },{
          id: 'jstconnstr', type: 'text', mode: ['properties'],
          label: '{{ _('Connection string') }}'
        },{
          id: 'jstdbname', label: '{{ _('Database') }}', type: 'text',
          control: 'node-list-by-name', node: 'database',
          cache_node: 'database', select2: {allowClear: true, placeholder: ''},
          disabled: function(m) {
            return !m.get('jstkind') || !m.get('jstconntype');
          }, deps: ['jstkind', 'jstconntype'], mode: ['create', 'edit'],
          helpMessage: '{{ _('Please select the database on which the job step will run.') }}'
        },{
          id: 'jstconnstr', label: '{{ _('Connection string') }}', type: 'text',
          deps: ['jstkind', 'jstconntype'], disabled: function(m) {
            return !m.get('jstkind') || m.get('jstconntype');
          }, helpMessage: S(
            '{{ _("Please specify the connection string for the remote database server. Each parameter setting is in the form keyword = value. Spaces around the equal sign are optional. To write an empty value, or a value containing spaces, surround it with single quotes, e.g., keyword = \\'a value\\'. Single quotes and backslashes within the value must be escaped with a backslash, i.e., \\\' and \\\\.<br>For more information, please see the documentation on %s") }}'
          ).sprintf(
            '<a href="https://www.postgresql.org/docs/current/static/libpq-connect.html#LIBPQ-CONNSTRING" target="_blank">libpq connection strings</a>'
          ).value(), mode: ['create', 'edit']
        },{
          id: 'jstonerror', label: '{{ _('On error') }}', cell: 'select2',
          control: 'select2', options: [
            {'label': '{{ _("Fail") }}', 'value': "f"},
            {'label': '{{ _("Success") }}', 'value': "s"},
            {'label': '{{ _("Ignore") }}', 'value': "i"}
          ], select2: {allowClear: false}, disabled: function(m) {
            return false;
          }
        },{
          id: 'jstdesc', label: '{{ _('Comment') }}', type: 'multiline'
        },{
          id: 'jstcode', label: '', cell: 'string', deps: ['jstkind'],
          type: 'text', control: 'sql-field', group: '{{ _('Code') }}',
          control: Backform.SqlFieldControl.extend({
            render: function() {
              if (this.model.get('jstkind')) {
                this.field.set('label', '{{ _('SQL query') }}');
              } else {
                this.field.set('label', '{{ _('Script') }}');
              }
              return Backform.SqlFieldControl.prototype.render.apply(
                this, arguments
              );
            }
          })
        }],
        validate: function(keys) {
          var val = this.get('jstname'),
              errMsg = null;

          if (
            _.isUndefined(val) || _.isNull(val) ||
            String(val).replace(/^\s+|\s+$/g, '') == ''
          ) {
            errMsg = '{{ _('Name cannot be empty.') }}';
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
                var msg = '{{ _('Please select a database.') }}';
                errMsg = errMsg || msg;
                this.errorModel.set('jstdbname', msg);
              } else {
                this.errorModel.unset('jstdbname');
              }
            } else {
              this.errorModel.unset('jstdbname');
              var msg,
                r = /\s*\b(\w+)\s*=\s*('([^'\\]*(?:\\.[^'\\]*)*)'|\w*)/g;
              val = this.get('jstconnstr');
              if (
                _.isUndefined(val) || _.isNull(val) ||
                  String(val).replace(/^\s+|\s+$/g, '') == ''
              ) {
                msg =  '{{ _("Please enter a connection string.") }}';
              } else if (String(val).replace(r, '') != '') {
                msg = '{{ _("Please enter a valid connection string.") }}';
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
                    msg = '{{ _("Please enter a valid connection string.") }}';
                    break;
                  }

                  msg = S(
                    '{{ _("Invalid parameter in the connection string - %s.") }}'
                  ).sprintf(m[1]).value();
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
            var msg = '{{ _('Please specify code to execute.') }}';
            errMsg = errMsg || msg;
            this.errorModel.set('jstcode', msg);
          } else {
            this.errorModel.unset('jstcode');
          }

          return errMsg;
        }
      })
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
