/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions } from '../../../../../static/js/node_ajax';
import PgaJobSchema from './pga_job.ui';
import { getNodePgaJobStepSchema } from '../../steps/static/js/pga_jobstep.ui';
import Notify from '../../../../../../static/js/helpers/Notifier';

define('pgadmin.node.pga_job', [
  'sources/gettext', 'sources/url_for', 'jquery', 'pgadmin.browser',
  'pgadmin.node.pga_jobstep', 'pgadmin.node.pga_schedule',
], function(gettext, url_for, $, pgBrowser) {

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
          data: {action: 'create'},
        },{
          name: 'create_pga_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('pgAgent Job...'),
          data: {action: 'create'},
        }, {
          name: 'run_now_pga_job', node: 'pga_job', module: this,
          applies: ['object', 'context'], callback: 'run_pga_job_now',
          priority: 4, label: gettext('Run now'), data: {action: 'create'},
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new PgaJobSchema(
          {
            jobjclid: ()=>getNodeAjaxOptions('classes', this, treeNodeInfo, itemNodeData, {
              cacheLevel: 'server',
              cacheNode: 'server'
            })
          },
          () => getNodePgaJobStepSchema(treeNodeInfo, itemNodeData),
        );
      },

      /* Run pgagent job now */
      run_pga_job_now: function(args) {
        let input = args || {},
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i  ? t.itemData(i) : undefined;

        if (d) {
          $.ajax({
            url: obj.generate_url(i, 'run_now', d, true),
            method:'PUT',
          })
          // 'pgagent.pga_job' table updated with current time to run the job
          // now.
            .done(function() { t.unload(i); })
            .fail(function(xhr, status, error) {
              Notify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
        }

        return false;
      },
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
