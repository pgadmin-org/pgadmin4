/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.pga_job', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.node.pga_jobstep', 'pgadmin.node.pga_schedule',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-pga_job']) {
    pgBrowser.Nodes['coll-pga_job'] =
      pgBrowser.Collection.extend({
        node: 'pga_job',
        label: gettext('pga_jobs'),
        type: 'coll-pga_job',
        columns: ['jobid', 'jobname', 'jobenabled', 'jlgstatus', 'jobnextrun', 'joblastrun', 'jobdesc'],
        hasStatistics: false,
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['pga_job']) {
    pgBrowser.Nodes['pga_job'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'pga_job',
      dialogHelp: url_for('help.static', {'filename': 'pgagent_jobs.html'}),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '80%',
      height: '80%',
      canDrop: true,
      label: gettext('pgAgent Job'),
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
          category: 'create', priority: 4, label: gettext('pgAgent Job...'),
          icon: 'wcTabIcon icon-pga_job', data: {action: 'create'},
        },{
          name: 'create_pga_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('pgAgent Job...'),
          icon: 'wcTabIcon icon-pga_job', data: {action: 'create'},
        }, {
          name: 'run_now_pga_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'run_pga_job_now',
          priority: 4, label: gettext('Run now'), data: {action: 'create'},
          icon: 'fa fa-play-circle',
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
          jschedules: [],
        },
        idAttribute: 'jobid',
        parse: function() {
          var d = pgBrowser.Node.Model.prototype.parse.apply(this, arguments);

          if (d) {
            d.jobrunningat = d.jagagent || gettext('Not running currently.');
            d.jlgstatus = d.jlgstatus || gettext('Unknown');
          }
          return d;
        },
        schema: [{
          id: 'jobname', label: gettext('Name'), type: 'text',
          cellHeaderClasses: 'width_percent_30',
        },{
          id: 'jobid', label: gettext('ID'), mode: ['properties'],
          type: 'int',
        },{
          id: 'jobenabled', label: gettext('Enabled?'), type: 'switch',
          cellHeaderClasses: 'width_percent_5',
        },{
          id: 'jobclass', label: gettext('Job class'), type: 'text',
          mode: ['properties'],
        },{
          id: 'jobjclid', label: gettext('Job class'), type: 'int',
          control: 'node-ajax-options', url: 'classes', url_with_id: false,
          cache_node: 'server', mode: ['create', 'edit'],
          select2: {allowClear: false},
          helpMessage: gettext('Please select a class to categorize the job. This option will not affect the way the job runs.'),
        },{
          id: 'jobhostagent', label: gettext('Host agent'), type: 'text',
          mode: ['edit', 'create'],
          helpMessage: gettext('Enter the hostname of a machine running pgAgent if you wish to ensure only that machine will run this job. Leave blank if any host may run the job.'),
        },{
          id: 'jobhostagent', label: gettext('Host agent'), type: 'text',
          mode: ['properties'],
        },{
          id: 'jobcreated', type: 'text', mode: ['properties'],
          label: gettext('Created'),
        },{
          id: 'jobchanged', type: 'text', mode: ['properties'],
          label: gettext('Changed'),
        },{
          id: 'jobnextrun', type: 'text', mode: ['properties'],
          label: gettext('Next run'), cellHeaderClasses: 'width_percent_20',
        },{
          id: 'joblastrun', type: 'text', mode: ['properties'],
          label: gettext('Last run'), cellHeaderClasses: 'width_percent_20',
        },{
          id: 'jlgstatus', type: 'text', label: gettext('Last result'),
          cellHeaderClasses: 'width_percent_5', mode: ['properties'],
        },{
          id: 'jobrunningat', type: 'text', mode: ['properties'],
          label: gettext('Running at'),
        },{
          id: 'jobdesc', label: gettext('Comment'), type: 'multiline',
          cellHeaderClasses: 'width_percent_15',
        },{
          id: 'jsteps', label: '', group: gettext('Steps'),
          type: 'collection', mode: ['edit', 'create'],
          model: pgBrowser.Nodes['pga_jobstep'].model, canEdit: true,
          control: 'sub-node-collection', canAdd: true, canDelete: true,
          showError: false,
          columns: [
            'jstname', 'jstenabled', 'jstkind', 'jstconntype', 'jstonerror',
          ],
        },{
          id: 'jschedules', label: '', group: gettext('Schedules'),
          type: 'collection', mode: ['edit', 'create'],
          control: 'sub-node-collection', canAdd: true, canDelete: true,
          canEdit: true, model: pgBrowser.Nodes['pga_schedule'].model,
          showError: false,
          columns: ['jscname', 'jscenabled', 'jscstart', 'jscend'],
        }],
        validate: function() {
          var name = this.get('jobname');
          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = gettext('Name cannot be empty.');
            this.errorModel.set('jobname', msg);
            return msg;
          } else {
            this.errorModel.unset('jobname');
          }
          return null;
        },
      }),
      /* Run pgagent job now */
      run_pga_job_now: function(args) {
        var input = args || {},
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return false;

        $.ajax({
          url: obj.generate_url(i, 'run_now', d, true),
          method:'PUT',
        })
        // 'pgagent.pga_job' table updated with current time to run the job
        // now.
          .done(function() { t.unload(i); })
          .fail(function(xhr, status, error) {
            alertify.pgRespErrorNotify(xhr, error);
            t.unload(i);
          });

        return false;
      },
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
