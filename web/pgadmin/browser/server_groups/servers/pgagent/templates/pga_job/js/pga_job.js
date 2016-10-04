define(
  [
    'jquery', 'underscore', 'underscore.string', 'pgadmin',
    'pgadmin.browser', 'alertify', 'pgadmin.node.pga_jobstep',
    'pgadmin.node.pga_schedule'
  ],
function($, _, S, pgAdmin, pgBrowser, Alertify) {

  if (!pgBrowser.Nodes['coll-pga_job']) {
    var pga_jobs = pgBrowser.Nodes['coll-pga_job'] =
      pgBrowser.Collection.extend({
        node: 'pga_job',
        label: '{{ _('pga_jobs') }}',
        type: 'coll-pga_job',
        columns: ['jobid', 'jobname', 'jobenabled', 'jlgstatus', 'jobnextrun', 'joblastrun', 'jobdesc'],
        hasStatistics: false
      });
  };

  if (!pgBrowser.Nodes['pga_job']) {
    pgBrowser.Nodes['pga_job'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'pga_job',
      dialogHelp: '{{ url_for('help.static', filename='pgagent_jobs.html') }}',
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '80%',
      height: '80%',
      canDrop: function(node) {
        return true;
      },
      label: '{{ _('pgAgent Job') }}',
      node_image: function() {
        return 'icon-pga_job';
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_pga_job_on_coll', node: 'coll-pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('pgAgent Job...') }}',
          icon: 'wcTabIcon icon-pga_job', data: {action: 'create'}
        },{
          name: 'create_pga_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('pgAgent Job...') }}',
          icon: 'wcTabIcon icon-pga_job', data: {action: 'create'}
        }]);
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
          jobname: '',
          jobid: undefined,
          jobenabled: true,
          jobhostagent: '',
          jobjclid: 1,
          jobcreated: undefined,
          jobchanged: undefined,
          jobnextrun: undefined,
          joblastrun: undefined,
          jlgstatus: undefined,
          jobrunningat: undefined,
          jobdesc: '',
          jsteps: [],
          jschedules: []
        },
        idAttribute: 'jobid',
        parse: function() {
          var d = pgBrowser.Node.Model.prototype.parse.apply(this, arguments);

          if (d) {
            d.jobrunningat = d.jaghostagent || "{{ _('Not running currently.') }}";
            d.jlgstatus = d.jlgstatus || "{{ _('Unknown') }}";
          }
          return d;
        },
        schema: [{
          id: 'jobname', label: '{{ _('Name') }}', type: 'text',
          cellHeaderClasses: 'width_percent_30'
        },{
          id: 'jobid', label:'{{ _('ID') }}', mode: ['properties'],
          type: 'int'
        },{
          id: 'jobenabled', label:'{{ _('Enabled?') }}', type: 'switch',
          cellHeaderClasses: 'width_percent_5'
        },{
          id: 'jobclass', label: '{{ _('Job class') }}', type: 'text',
          mode: ['properties']
        },{
          id: 'jobjclid', label: '{{ _('Job class') }}', type: 'integer',
          control: 'node-ajax-options', url: 'classes', url_with_id: false,
          cache_node: 'server', mode: ['create', 'edit'],
          select2: {allowClear: false},
          helpMessage: '{{ _('Please select a class to categorize the job. This option will not affect the way the job runs.') }}'
        },{
          id: 'jobhostagent', label: '{{ _('Host agent') }}', type: 'text',
          mode: ['edit', 'create'],
          helpMessage: '{{ _('Enter the hostname of a machine running pgAgent if you wish to ensure only that machine will run this job. Leave blank if any host may run the job.') }}'
        },{
          id: 'jobhostagent', label: '{{ _('Host agent') }}', type: 'text',
          mode: ['properties']
        },{
          id: 'jobcreated', type: 'text', mode: ['properties'],
          label: '{{ _('Created') }}'
        },{
          id: 'jobchanged', type: 'text', mode: ['properties'],
          label: '{{ _('Changed') }}'
        },{
          id: 'jobnextrun', type: 'text', mode: ['properties'],
          label: '{{ _('Next run') }}', cellHeaderClasses: 'width_percent_20'
        },{
          id: 'joblastrun', type: 'text', mode: ['properties'],
          label: '{{ _('Last run') }}', cellHeaderClasses: 'width_percent_20'
        },{
          id: 'jlgstatus', type: 'text', label: '{{ _('Last result') }}',
          cellHeaderClasses: 'width_percent_5', mode: ['properties']
        },{
          id: 'jobrunningat', type: 'text', mode: ['properties'],
          label: '{{ _('Running at') }}'
        },{
          id: 'jobdesc', label:'{{ _('Comment') }}', type: 'multiline',
          cellHeaderClasses: 'width_percent_15'
        },{
          id: 'jsteps', label: '', group: '{{ _("Steps") }}',
          type: 'collection', mode: ['edit', 'create'],
          model: pgBrowser.Nodes['pga_jobstep'].model, canEdit: true,
          control: 'sub-node-collection', canAdd: true, canDelete: true,
          columns: [
            'jstname', 'jstenabled', 'jstkind', 'jstconntype', 'jstonerror'
          ]
        },{
          id: 'jschedules', label: '', group: '{{ _("Schedules") }}',
          type: 'collection', mode: ['edit', 'create'],
          control: 'sub-node-collection', canAdd: true, canDelete: true,
          canEdit: true, model: pgBrowser.Nodes['pga_schedule'].model,
          columns: ['jscname', 'jscenabled', 'jscstart', 'jscend']
        }],
        validate: function(keys) {
          var name = this.get('jobname');
          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('jobname', msg);
            return msg;
          } else {
            this.errorModel.unset('jobname');
          }
          return null;
        }
      })
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
