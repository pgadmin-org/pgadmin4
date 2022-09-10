/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePgaJobStepSchema } from './pga_jobstep.ui';
import _ from 'lodash';

define('pgadmin.node.pga_jobstep', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
], function(gettext, url_for, pgBrowser) {

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
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobsFtep',
        },{
          name: 'create_pga_jobstep', node: 'pga_jobstep', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Job Step...'),
          data: {'action': 'create'}, icon: 'wcTabIcon icon-pga_jobstep',
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodePgaJobStepSchema(treeNodeInfo, itemNodeData);
      },

      model: pgBrowser.Node.Model.extend({
        initialize: function() {
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
          if (this.isNew() && this.get('jstconntype')) {
            let args = arguments.length > 1 && arguments[1];

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
      }),
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
