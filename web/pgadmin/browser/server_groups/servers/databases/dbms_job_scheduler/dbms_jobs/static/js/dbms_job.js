/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import DBMSJobSchema from './dbms_job.ui';
import { getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import getApiInstance from '../../../../../../../../static/js/api_instance';


define('pgadmin.node.dbms_job', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-dbms_job']) {
    pgBrowser.Nodes['coll-dbms_job'] =
      pgBrowser.Collection.extend({
        node: 'dbms_job',
        label: gettext('DBMS Jobs'),
        type: 'coll-dbms_job',
        columns: ['jsjobname', 'jsjobenabled', 'jsjobruncount', 'jsjobfailurecount', 'jsjobdesc'],
        hasSQL:  false,
        hasDepends: false,
        hasStatistics: false,
        hasScriptTypes: [],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['dbms_job']) {
    pgAdmin.Browser.Nodes['dbms_job'] = pgAdmin.Browser.Node.extend({
      parent_type: 'dbms_job_scheduler',
      type: 'dbms_job',
      label: gettext('DBMS Job'),
      node_image: 'icon-pga_job',
      epasHelp: true,
      epasURL: 'https://www.enterprisedb.com/docs/epas/$VERSION$/epas_compat_bip_guide/03_built-in_packages/15_dbms_scheduler/02_create_job/',
      dialogHelp: url_for('help.static', {'filename': 'dbms_job.html'}),
      canDrop: true,
      hasSQL:  true,
      hasDepends: false,
      hasStatistics: false,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_dbms_job_on_coll', node: 'coll-dbms_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Job...'),
          data: {action: 'create'},
        },{
          name: 'create_dbms_job', node: 'dbms_job', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Job...'),
          data: {action: 'create'},
        },{
          name: 'create_dbms_job', node: 'dbms_job_scheduler', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Job...'),
          data: {action: 'create'},
        }, {
          name: 'enable_job', node: 'dbms_job', module: this,
          applies: ['object', 'context'], callback: 'enable_job',
          priority: 4, label: gettext('Enable Job'),
          enable : 'is_enabled',data: {
            data_disabled: gettext('Job is already enabled.'),
          },
        }, {
          name: 'disable_job', node: 'dbms_job', module: this,
          applies: ['object', 'context'], callback: 'disable_job',
          priority: 4, label: gettext('Disable Job'),
          enable : 'is_disabled',data: {
            data_disabled: gettext('Job is already disabled.'),
          },
        }, {
          name: 'run_job', node: 'dbms_job', module: this,
          applies: ['object', 'context'], callback: 'run_job',
          priority: 4, label: gettext('Run Job'),
          enable : 'is_disabled', data: {
            data_disabled: gettext('Job is already disabled.'),
          }
        }
        ]);
      },
      is_enabled: function(node) {
        return !node?.is_enabled;
      },
      is_disabled: function(node) {
        return node?.is_enabled;
      },
      callbacks: {
        enable_job: function(args, notify) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            notify = notify || _.isUndefined(notify) || _.isNull(notify);
            let enable = function() {
              let data = d;
              getApiInstance().put(
                obj.generate_url(i, 'enable_disable', d, true),
                {'job_name': data.label, 'is_enable_job': true}
              ).then(({data: res})=> {
                if (res.success == 1) {
                  pgAdmin.Browser.notifier.success(res.info);
                  t.removeIcon(i);
                  data.icon = 'icon-pga_jobstep';
                  data.is_enabled = true;
                  t.addIcon(i, {icon: data.icon});
                  t.updateAndReselectNode(i, data);
                }
              }).catch(function(error) {
                pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                t.refresh(i);
              });
            };
            if (notify) {
              pgAdmin.Browser.notifier.confirm(
                gettext('Enable Job'),
                gettext('Are you sure you want to enable the job %s?', d.label),
                function() { enable(); },
                function() { return true;},
              );
            } else {
              enable();
            }
          }

          return false;
        },
        disable_job: function(args, notify) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            notify = notify || _.isUndefined(notify) || _.isNull(notify);
            let disable = function() {
              let data = d;
              getApiInstance().put(
                obj.generate_url(i, 'enable_disable', d, true),
                {'job_name': data.label, 'is_enable_job': false}
              ).then(({data: res})=> {
                if (res.success == 1) {
                  pgAdmin.Browser.notifier.success(res.info);
                  t.removeIcon(i);
                  data.icon = 'icon-pga_jobstep-disabled';
                  data.is_enabled = false;
                  t.addIcon(i, {icon: data.icon});
                  t.updateAndReselectNode(i, data);
                }
              }).catch(function(error) {
                pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                t.refresh(i);
              });
            };
            if (notify) {
              pgAdmin.Browser.notifier.confirm(
                gettext('Disable Job'),
                gettext('Are you sure you want to disable the job %s?', d.label),
                function() { disable(); },
                function() { return true;},
              );
            } else {
              disable();
            }
          }
          return false;
        },
        run_job: function(args, notify) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            notify = notify || _.isUndefined(notify) || _.isNull(notify);
            let run = function() {
              let data = d;
              getApiInstance().put(
                obj.generate_url(i, 'run_job', d, true),
                {'job_name': data.label}
              ).then(({data: res})=> {
                if (res.success == 1) {
                  pgAdmin.Browser.notifier.success(res.info);
                }
              }).catch(function(error) {
                pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              });
            };
            if (notify) {
              pgAdmin.Browser.notifier.confirm(
                gettext('Run Job'),
                gettext('Are you sure you want to run the job %s now?', d.label),
                function() { run(); },
                function() { return true;},
              );
            } else {
              run();
            }
          }
          return false;
        }
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new DBMSJobSchema(
          {
            procedures: ()=>getNodeAjaxOptions('get_procedures', this, treeNodeInfo, itemNodeData),
            programs: ()=>getNodeAjaxOptions('get_programs', this, treeNodeInfo, itemNodeData),
            schedules: ()=>getNodeAjaxOptions('get_schedules', this, treeNodeInfo, itemNodeData)
          }
        );
      },
    });
  }

  return pgBrowser.Nodes['dbms_job'];
});
