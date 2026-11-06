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
      columns: ['chain_id', 'chain_name', 'live', 'status', 'run_at'],
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

      getSchema: function () {
        return new PgtChainSchema({}, () => getNodePgtChainTaskSchema());
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
              if (res.data && res.data.notification) {
                pgAdmin.Browser.notifier.success(res.info);
              } else {
                pgAdmin.Browser.notifier.warning(res.info);
              }
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

  /* Whether the server tree item has a loaded pgTimeTable Chains child. */
  function hasPgtChainCollection(serverItem) {
    return (pgBrowser.tree.children(serverItem) || []).some(
      (child) => pgBrowser.tree.itemData(child)?._type === 'coll-pgt_chain'
    );
  }

  /* The server is selected (and its menus evaluated) before its children
   * are loaded, so re-evaluate the menus once the collection appears. */
  pgBrowser.Events.on('pgadmin-browser:tree:added', function (_item, data) {
    if (data?._type === 'coll-pgt_chain') {
      pgBrowser.enable_disable_menus();
    }
  });

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
      /* The backend only adds the pgTimeTable Chains collection to a
       * server when pg_timetable is usable in its maintenance database,
       * so offer this menu only when that collection node is present. */
      enable: function (node, item) {
        return Boolean(node?.connected) && hasPgtChainCollection(item);
      },
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
    },
  ]);
  return pgBrowser.Nodes['pgt_chain'];
});
