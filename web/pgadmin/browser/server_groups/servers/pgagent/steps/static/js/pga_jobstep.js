/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePgaJobStepSchema } from './pga_jobstep.ui';

define('pgadmin.node.pga_jobstep', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'alertify', 'backform',
  'backgrid', 'pgadmin.backform',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Alertify, Backform) {

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
          cellHeaderClasses: 'width_percent_60',
        },{
          id: 'jstenabled', label: gettext('Enabled?'),
          type: 'switch',
        },{
          id: 'jstkind', label: gettext('Kind'), type: 'switch',
          options: {
            'onText': gettext('SQL'), 'offText': gettext('Batch'),
            'onColor': 'primary', 'offColor': 'primary',
          }, control: Backform.SwitchControl,
        },{
          id: 'jstconntype', label: gettext('Connection type'),
          type: 'switch', deps: ['jstkind'], mode: ['properties'],
          disabled: function(m) { return !m.get('jstkind'); },
          options: {
            'onText': gettext('Local'), 'offText': gettext('Remote'),
            'onColor': 'primary', 'offColor': 'primary', width: '65',
          },
        },{
          id: 'jstonerror', label: gettext('On error'), cell: 'select2',
          control: 'select2', options: [
            {'label': gettext('Fail'), 'value': 'f'},
            {'label': gettext('Success'), 'value': 's'},
            {'label': gettext('Ignore'), 'value': 'i'},
          ], select2: {allowClear: false},
        }],
      }),
    });
  }

  return pgBrowser.Nodes['pga_job'];
});
