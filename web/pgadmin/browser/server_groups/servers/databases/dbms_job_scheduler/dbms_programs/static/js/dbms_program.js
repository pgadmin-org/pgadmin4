/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import DBMSProgramSchema from './dbms_program.ui';
import { getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import getApiInstance from '../../../../../../../../static/js/api_instance';

define('pgadmin.node.dbms_program', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-dbms_program']) {
    pgBrowser.Nodes['coll-dbms_program'] =
      pgBrowser.Collection.extend({
        node: 'dbms_program',
        label: gettext('DBMS Programs'),
        type: 'coll-dbms_program',
        columns: ['jsprname', 'jsprtype', 'jsprenabled', 'jsprdesc'],
        hasSQL:  false,
        hasDepends: false,
        hasStatistics: false,
        hasScriptTypes: [],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['dbms_program']) {
    pgAdmin.Browser.Nodes['dbms_program'] = pgAdmin.Browser.Node.extend({
      parent_type: 'dbms_job_scheduler',
      type: 'dbms_program',
      label: gettext('DBMS Program'),
      node_image: 'icon-pga_jobstep',
      epasHelp: true,
      epasURL: 'https://www.enterprisedb.com/docs/epas/$VERSION$/epas_compat_bip_guide/03_built-in_packages/15_dbms_scheduler/03_create_program/',
      dialogHelp: url_for('help.static', {'filename': 'dbms_program.html'}),
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
          name: 'create_dbms_program_on_coll', node: 'coll-dbms_program', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Program...'),
          data: {action: 'create'},
        }, {
          name: 'create_dbms_program', node: 'dbms_program', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Program...'),
          data: {action: 'create'},
        }, {
          name: 'create_dbms_program', node: 'dbms_job_scheduler', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('DBMS Program...'),
          data: {action: 'create'},
        }, {
          name: 'enable_program', node: 'dbms_program', module: this,
          applies: ['object', 'context'], callback: 'enable_program',
          priority: 4, label: gettext('Enable Program'),
          enable : 'is_enabled',data: {
            data_disabled: gettext('Program is already enabled.'),
          },
        }, {
          name: 'disable_program', node: 'dbms_program', module: this,
          applies: ['object', 'context'], callback: 'disable_program',
          priority: 4, label: gettext('Disable Program'),
          enable : 'is_disabled',data: {
            data_disabled: gettext('Program is already disabled.'),
          },
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
        enable_program: function(args, notify) {
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
                {'program_name': data.label, 'is_enable_program': true}
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
                gettext('Enable Program'),
                gettext('Are you sure you want to enable the program %s?', d.label),
                function() { enable(); },
                function() { return true;},
              );
            } else {
              enable();
            }
          }

          return false;
        },
        disable_program: function(args, notify) {
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
                {'program_name': data.label, 'is_enable_program': false}
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
                gettext('Disable Program'),
                gettext('Are you sure you want to disable the program %s?', d.label),
                function() { disable(); },
                function() { return true;},
              );
            } else {
              disable();
            }
          }
          return false;
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new DBMSProgramSchema(
          {
            procedures: ()=>getNodeAjaxOptions('get_procedures', this, treeNodeInfo, itemNodeData),
          }
        );
      },
    });
  }

  return pgBrowser.Nodes['dbms_program'];
});
