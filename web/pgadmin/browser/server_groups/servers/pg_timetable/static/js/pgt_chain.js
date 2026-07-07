///////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
///////////////////////////////////////////////////////////////

import PgtChainSchema from './pgt_chain.ui';
import { getNodePgtChainTaskSchema } from '../../tasks/static/js/pgt_chaintask.ui';
import getApiInstance from '../../../../../../static/js/api_instance';
import pgAdmin from 'sources/pgadmin';

define('pgadmin.node.pgt_chain', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.pgt_chaintask',
], function(gettext, url_for, pgBrowser) {
  if (!pgBrowser.Nodes['coll-pgt_chain']) {
    pgBrowser.Nodes['coll-pgt_chain'] = pgBrowser.Collection.extend({
      node: 'pgt_chain',
      label: gettext('pgt_chains'),
      type: 'coll-pgt_chain',
      columns: ['chain_id', 'chain_name', 'live', 'returncode', 'run_at'],
      hasStatistics: false,
      canDrop: true,
      canDropCascade: false,
    });
  }

  if (!pgBrowser.Nodes['pgt_chain']) {
    pgBrowser.Nodes['pgt_chain'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'pgt_chain',
      dialogHelp: url_for('help.static', { filename: 'pgtimetable_chains.html' }),
      hasSQL: true,
      hasDepends: false,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      width: '80%',
      height: '80%',
      canDrop: true,
      label: gettext('pgTimeTable Chain'),
      node_image: function () {
        return 'icon-pgt_chain';
      },
      Init: function () {
        if (this.initialized) {
          return;
        }
        this.initialized = true;
      },

      getSchema: function (treeNodeInfo, itemNodeData) {
        return new PgtChainSchema({}, () => getNodePgtChainTaskSchema(treeNodeInfo, itemNodeData));
      },

      run_pgt_chain_now: function (args) {
        var input = args || {};
        var obj = this;
        var t = pgBrowser.tree;
        var i = input.item || t.selected();
        var d = i ? t.itemData(i) : undefined;
        if (d) {
          getApiInstance()
            .put(obj.generate_url(i, 'run_now', d, true))
            .then(({ data: res }) => {
              pgAdmin.Browser.notifier.success(res.info);
              t.unload(i);
            })
            .catch(function (error) {
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.unload(i);
            });
        }
        return false;
      },
    });
  }
  pgBrowser.add_menus([
    {
      name: 'create_pgt_chain_on_server',
      node: 'server',
      module: pgBrowser.Nodes['pgt_chain'],
      applies: ['object', 'context'],
      callback: 'show_obj_properties',
      category: 'create',
      priority: 4,
      label: gettext('pgTimeTable Chain...'),
      data: { action: 'create' },
    },
    {
      name: 'create_pgt_chain_on_coll',
      node: 'coll-pgt_chain',
      module: pgBrowser.Nodes['pgt_chain'],
      applies: ['object', 'context'],
      callback: 'show_obj_properties',
      category: 'create',
      priority: 4,
      label: gettext('pgTimeTable Chain...'),
      data: { action: 'create' },
    },
    {
      name: 'create_pgt_chain',
      node: 'pgt_chain',
      module: pgBrowser.Nodes['pgt_chain'],
      applies: ['object', 'context'],
      callback: 'show_obj_properties',
      category: 'create',
      priority: 4,
      label: gettext('pgTimeTable Chain...'),
      data: { action: 'create' },
    },
    {
      name: 'run_now_pgt_chain',
      node: 'pgt_chain',
      module: pgBrowser.Nodes['pgt_chain'],
      applies: ['object', 'context'],
      callback: 'run_pgt_chain_now',
      priority: 4,
      label: gettext('Run now'),
      data: { action: 'create' },
    },
  ]);
  return pgBrowser.Nodes['pgt_chain'];
});
