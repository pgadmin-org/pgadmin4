/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import axios from 'axios';
import pgAdmin from 'sources/pgadmin';

export function disableTriggers(tree, generateUrl, args) {
  return setTriggers(tree, generateUrl, args, {is_enable_trigger: 'D' });
}
export function enableTriggers(tree, generateUrl, args) {
  return setTriggers(tree, generateUrl, args, {is_enable_trigger: 'O' });
}

function setTriggers(tree, generateUrl, args, params) {
  const treeNode = retrieveTreeNode(args, tree);

  if (!treeNode || treeNode.getData() === null || treeNode.getData() === undefined)
    return false;

  axios.put(
    generateUrl(treeNode.getHtmlIdentifier(), 'set_trigger', treeNode.getData(), true),
    params
  )
    .then((res) => {
      if (res.data.success === 1) {
        pgAdmin.Browser.notifier.success(res.data.info);
        treeNode.data.has_enable_triggers = res.data.data.has_enable_triggers;
        treeNode.reload(tree);

      }
    })
    .catch((xhr) => {
      try {
        const err = xhr.response.data;
        if (err.success === 0) {
          pgAdmin.Browser.notifier.error(err.errormsg);
        }
      } catch (e) {
        console.warn(e.stack || e);
      }
      treeNode.unload(tree);
    });
}

function retrieveTreeNode(args, tree) {
  const input = args || {};
  const domElementIdentifier = input.item || tree.selected();
  return tree.findNodeByDomElement(domElementIdentifier);
}
